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

const JobUpdateSchema = z
  .object({
    clientId: z.string().trim().min(1).max(128).optional(),
    title: z.string().trim().min(2).max(180).optional(),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    status: JobStatusSchema.optional(),
    scheduledAt: z.string().datetime().optional().or(z.literal("")),
    completedAt: z.string().datetime().optional().or(z.literal("")),
    location: z.string().trim().max(500).optional().or(z.literal("")),
    durationMinutes: z.coerce.number().int().min(1).max(1440).optional().nullable(),
    materials: z.string().trim().max(2000).optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    photoUrls: z.array(z.string().trim().url().max(2048)).max(20).optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

type JobRouteParams = {
  params: {
    id: string;
  };
};

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

export async function GET(req: NextRequest, { params }: JobRouteParams) {
  try {
    const { orgId } = await getOrgContext(req);

    const job = await withOrgContext(orgId, (tx) =>
      tx.job.findFirst({
        where: {
          id: params.id,
          organizationId: orgId
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
      })
    );

    if (!job) {
      return notFound();
    }

    return NextResponse.json({ job });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Job detail failed", error);
    return serverError();
  }
}

export async function PATCH(req: NextRequest, { params }: JobRouteParams) {
  try {
    const { orgId } = await getOrgContext(req);
    const parsed = JobUpdateSchema.safeParse(await req.json());

    if (!parsed.success) {
      return badRequest("Invalid job details.");
    }

    const job = await withOrgContext(orgId, async (tx) => {
      const existing = await tx.job.findFirst({
        where: {
          id: params.id,
          organizationId: orgId
        },
        select: { id: true }
      });

      if (!existing) {
        return null;
      }

      if (parsed.data.clientId !== undefined) {
        const client = await tx.client.findFirst({
          where: {
            id: parsed.data.clientId,
            organizationId: orgId,
            isActive: true
          },
          select: { id: true }
        });

        if (!client) {
          return "client-not-found" as const;
        }
      }

      return tx.job.update({
        where: { id: existing.id },
        data: {
          ...(parsed.data.clientId !== undefined ? { clientId: parsed.data.clientId } : {}),
          ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
          ...(parsed.data.description !== undefined
            ? { description: emptyToNull(parsed.data.description) }
            : {}),
          ...(parsed.data.status !== undefined ? { status: parsed.data.status as JobStatus } : {}),
          ...(parsed.data.scheduledAt !== undefined
            ? { scheduledAt: dateToNull(parsed.data.scheduledAt) }
            : {}),
          ...(parsed.data.completedAt !== undefined
            ? { completedAt: dateToNull(parsed.data.completedAt) }
            : {}),
          ...(parsed.data.location !== undefined ? { location: emptyToNull(parsed.data.location) } : {}),
          ...(parsed.data.durationMinutes !== undefined
            ? { durationMinutes: parsed.data.durationMinutes }
            : {}),
          ...(parsed.data.materials !== undefined
            ? { materials: emptyToNull(parsed.data.materials) }
            : {}),
          ...(parsed.data.notes !== undefined ? { notes: emptyToNull(parsed.data.notes) } : {}),
          ...(parsed.data.photoUrls !== undefined ? { photoUrls: parsed.data.photoUrls } : {})
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

    if (!job || job === "client-not-found") {
      return notFound();
    }

    return NextResponse.json({ job });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Job update failed", error);
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: JobRouteParams) {
  try {
    const { orgId, role } = await getOrgContext(req);

    if (role === "MEMBER") {
      return forbidden("Members cannot delete records.");
    }

    const job = await withOrgContext(orgId, async (tx) => {
      const existing = await tx.job.findFirst({
        where: {
          id: params.id,
          organizationId: orgId
        },
        select: { id: true }
      });

      if (!existing) {
        return null;
      }

      return tx.job.delete({
        where: { id: existing.id }
      });
    });

    if (!job) {
      return notFound();
    }

    return NextResponse.json({ job });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Job delete failed", error);
    return serverError();
  }
}
