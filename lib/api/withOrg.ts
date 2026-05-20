import type { OrgMemberRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions } from "../auth/authOptions";
import { withOrgContext } from "../db/withOrgContext";
import { prisma } from "../prisma";

const TRUSTED_ORG_ID_HEADER = "x-org-id";
const TRUSTED_ORG_SLUG_HEADER = "x-org-slug";

export class OrgContextError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 | 404
  ) {
    super(message);
    this.name = "OrgContextError";
  }
}

export type OrgContextUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: Date | null;
};

export type OrgContext = {
  user: OrgContextUser;
  orgId: string;
  role: OrgMemberRole;
};

export async function getOrgContext(req: NextRequest): Promise<OrgContext> {
  const session = await getServerSession(authOptions);
  const trustedOrgId = req.headers.get(TRUSTED_ORG_ID_HEADER);
  const trustedOrgSlug = req.headers.get(TRUSTED_ORG_SLUG_HEADER);

  if (!session?.user?.id || (!trustedOrgId && !trustedOrgSlug)) {
    throw new OrgContextError("Unauthorized", 401);
  }

  const organization = trustedOrgId
    ? await prisma.organization.findUnique({
        where: { id: trustedOrgId },
        select: { id: true, isSuspended: true }
      })
    : await prisma.organization.findUnique({
        where: { slug: trustedOrgSlug ?? "" },
        select: { id: true, isSuspended: true }
      });

  if (!organization) {
    throw new OrgContextError("Organization not found", 404);
  }

  if (organization.isSuspended) {
    throw new OrgContextError("Organization suspended", 403);
  }

  const orgId = organization.id;

  return withOrgContext(orgId, async (tx) => {
    const membership = await tx.organizationMember.findFirst({
      where: { userId: session.user.id, organizationId: orgId },
      select: {
        role: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            emailVerified: true
          }
        }
      }
    });

    if (!membership) {
      throw new OrgContextError("Forbidden", 403);
    }

    return {
      user: membership.user,
      orgId,
      role: membership.role
    };
  });
}
