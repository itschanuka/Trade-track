import { z } from "zod";
import type { JobStatus } from "@prisma/client";
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

const JobStatusSchema = z.enum([
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "INVOICED",
  "CANCELLED"
]);

const JobSchema = z
  .object({
    clientId: z.string().trim().min(1).max(128),
    title: z.string().trim().min(2).max(180),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    status: JobStatusSchema.optional(),
    scheduledAt: z.string().datetime().optional().or(z.literal("")),
    completedAt: z.string().datetime().optional().or(z.literal("")),
    location: z.string().trim().max(500).optional().or(z.literal("")),
    durationMinutes: z.coerce.number().int().min(1).max(1440).optional(),
    materials: z.string().trim().max(2000).optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    photoUrls: z.array(z.string().trim().url().max(2048)).max(20).optional()
  })
  .strict();

const JobListQuerySchema = z
  .object({
    status: JobStatusSchema.optional(),
    clientId: z.string().trim().min(1).max(128).optional(),
    search: z.string().trim().max(120).optional()
  })
  .strict();

function emptyToNull(value: string | undefined) {
  return value?.trim() ? value.trim() : null;
}

function dateToNull(value: string | undefined) {
  return value?.trim() ? new Date(value) : null;
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
    const parsed = JobListQuerySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      clientId: url.searchParams.get("clientId") ?? undefined,
      search: url.searchParams.get("search") ?? undefined
    });

    if (!parsed.success) {
      return badRequest("Invalid job filters.");
    }

    const { clientId, search, status } = parsed.data;
    const jobs = await withOrgContext(orgId, (tx) =>
      tx.job.findMany({
        where: {
          organizationId: orgId,
          ...(status ? { status: status as JobStatus } : {}),
          ...(clientId ? { clientId } : {}),
          ...(search
            ? {
                OR: [
                  { title: { contains: search, mode: "insensitive" } },
                  { description: { contains: search, mode: "insensitive" } },
                  { location: { contains: search, mode: "insensitive" } },
                  { client: { name: { contains: search, mode: "insensitive" } } }
                ]
              }
            : {})
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true
            }
          },
          quote: {
            select: {
              id: true,
              quoteNumber: true,
              status: true
            }
          }
        },
        orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }]
      })
    );

    return NextResponse.json({ jobs });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Job list failed", error);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await getOrgContext(req);
    const parsed = JobSchema.safeParse(await req.json());

    if (!parsed.success) {
      return badRequest("Invalid job details.");
    }

    const job = await withOrgContext(orgId, async (tx) => {
      const client = await tx.client.findFirst({
        where: {
          id: parsed.data.clientId,
          organizationId: orgId,
          isActive: true
        },
        select: { id: true }
      });

      if (!client) {
        return null;
      }

      return tx.job.create({
        data: {
          organizationId: orgId,
          clientId: client.id,
          title: parsed.data.title.trim(),
          description: emptyToNull(parsed.data.description),
          status: (parsed.data.status ?? "SCHEDULED") as JobStatus,
          scheduledAt: dateToNull(parsed.data.scheduledAt),
          completedAt: dateToNull(parsed.data.completedAt),
          location: emptyToNull(parsed.data.location),
          durationMinutes: parsed.data.durationMinutes ?? null,
          materials: emptyToNull(parsed.data.materials),
          notes: emptyToNull(parsed.data.notes),
          photoUrls: parsed.data.photoUrls ?? []
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true
            }
          },
          quote: {
            select: {
              id: true,
              quoteNumber: true,
              status: true
            }
          }
        }
      });
    });

    if (!job) {
      return notFound();
    }

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Job create failed", error);
    return serverError();
  }
}
