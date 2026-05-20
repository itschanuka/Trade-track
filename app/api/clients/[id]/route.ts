import { z } from "zod";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  badRequest,
  forbidden,
  notFound,
  serverError,
  unauthorized
} from "@/lib/api/errors";
import { getOrgContext, OrgContextError } from "@/lib/api/withOrg";
import { withOrgContext } from "@/lib/db/withOrgContext";

export const dynamic = "force-dynamic";

const ClientUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(160).optional(),
    email: z.string().trim().email().max(255).optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    address: z.string().trim().max(500).optional().or(z.literal("")),
    jobType: z.string().trim().max(120).optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal(""))
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

type ClientRouteParams = {
  params: {
    id: string;
  };
};

function emptyToNull(value: string | undefined) {
  return value?.trim() ? value.trim() : null;
}

function handleOrgContextError(error: OrgContextError) {
  if (error.status === 401) {
    return unauthorized();
  }

  if (error.status === 403) {
    return forbidden();
  }

  return notFound();
}

export async function GET(req: NextRequest, { params }: ClientRouteParams) {
  try {
    const { orgId } = await getOrgContext(req);

    const client = await withOrgContext(orgId, (tx) =>
      tx.client.findFirst({
        where: {
          id: params.id,
          organizationId: orgId,
          isActive: true
        },
        include: {
          _count: {
            select: {
              invoices: true,
              jobs: true,
              quotes: true
            }
          }
        }
      })
    );

    if (!client) {
      return notFound();
    }

    return NextResponse.json({ client });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Client detail failed", error);
    return serverError();
  }
}

export async function PATCH(req: NextRequest, { params }: ClientRouteParams) {
  try {
    const { orgId } = await getOrgContext(req);
    const parsed = ClientUpdateSchema.safeParse(await req.json());

    if (!parsed.success) {
      return badRequest("Invalid client details.");
    }

    const client = await withOrgContext(orgId, async (tx) => {
      const existing = await tx.client.findFirst({
        where: {
          id: params.id,
          organizationId: orgId,
          isActive: true
        },
        select: { id: true }
      });

      if (!existing) {
        return null;
      }

      return tx.client.update({
        where: { id: existing.id },
        data: {
          ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
          ...(parsed.data.email !== undefined ? { email: emptyToNull(parsed.data.email) } : {}),
          ...(parsed.data.phone !== undefined ? { phone: emptyToNull(parsed.data.phone) } : {}),
          ...(parsed.data.address !== undefined
            ? { address: emptyToNull(parsed.data.address) }
            : {}),
          ...(parsed.data.jobType !== undefined ? { jobType: emptyToNull(parsed.data.jobType) } : {}),
          ...(parsed.data.notes !== undefined ? { notes: emptyToNull(parsed.data.notes) } : {})
        },
        include: {
          _count: {
            select: {
              invoices: true,
              jobs: true,
              quotes: true
            }
          }
        }
      });
    });

    if (!client) {
      return notFound();
    }

    return NextResponse.json({ client });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Client update failed", error);
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: ClientRouteParams) {
  try {
    const { orgId, role } = await getOrgContext(req);

    if (role === "MEMBER") {
      return forbidden("Members cannot delete records.");
    }

    const client = await withOrgContext(orgId, async (tx) => {
      const existing = await tx.client.findFirst({
        where: {
          id: params.id,
          organizationId: orgId,
          isActive: true
        },
        select: { id: true }
      });

      if (!existing) {
        return null;
      }

      return tx.client.update({
        where: { id: existing.id },
        data: { isActive: false },
        include: {
          _count: {
            select: {
              invoices: true,
              jobs: true,
              quotes: true
            }
          }
        }
      });
    });

    if (!client) {
      return notFound();
    }

    return NextResponse.json({ client });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Client delete failed", error);
    return serverError();
  }
}
