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

const ClientSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    email: z.string().trim().email().max(255).optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    address: z.string().trim().max(500).optional().or(z.literal("")),
    jobType: z.string().trim().max(120).optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal(""))
  })
  .strict();

const ClientListQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional()
  })
  .strict();

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

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await getOrgContext(req);
    const url = new URL(req.url);
    const parsed = ClientListQuerySchema.safeParse({
      search: url.searchParams.get("search") ?? undefined
    });

    if (!parsed.success) {
      return badRequest("Invalid client search.");
    }

    const search = parsed.data.search;
    const clients = await withOrgContext(orgId, (tx) =>
      tx.client.findMany({
        where: {
          organizationId: orgId,
          isActive: true,
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                  { phone: { contains: search, mode: "insensitive" } },
                  { jobType: { contains: search, mode: "insensitive" } }
                ]
              }
            : {})
        },
        include: {
          _count: {
            select: {
              invoices: true,
              jobs: true,
              quotes: true
            }
          }
        },
        orderBy: [{ name: "asc" }, { createdAt: "desc" }]
      })
    );

    return NextResponse.json({ clients });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Client list failed", error);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await getOrgContext(req);
    const parsed = ClientSchema.safeParse(await req.json());

    if (!parsed.success) {
      return badRequest("Invalid client details.");
    }

    const client = await withOrgContext(orgId, async (tx) => {
      return tx.client.create({
        data: {
          organizationId: orgId,
          name: parsed.data.name.trim(),
          email: emptyToNull(parsed.data.email),
          phone: emptyToNull(parsed.data.phone),
          address: emptyToNull(parsed.data.address),
          jobType: emptyToNull(parsed.data.jobType),
          notes: emptyToNull(parsed.data.notes)
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

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Client create failed", error);
    return serverError();
  }
}
