import { z } from "zod";
import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  serverError,
  unauthorized
} from "@/lib/api/errors";
import { getOrgContext, OrgContextError } from "@/lib/api/withOrg";
import { withOrgContext } from "@/lib/db/withOrgContext";

export const dynamic = "force-dynamic";

const ConvertQuoteSchema = z
  .object({
    title: z.string().trim().min(2).max(180).optional(),
    scheduledAt: z.string().datetime().optional().or(z.literal("")),
    location: z.string().trim().max(500).optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal(""))
  })
  .strict();

type ConvertQuoteRouteParams = {
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

export async function POST(req: NextRequest, { params }: ConvertQuoteRouteParams) {
  try {
    const { orgId } = await getOrgContext(req);
    const parsed = ConvertQuoteSchema.safeParse(await req.json());

    if (!parsed.success) {
      return badRequest("Invalid job conversion details.");
    }

    const job = await withOrgContext(orgId, async (tx) => {
      const quote = await tx.quote.findFirst({
        where: {
          id: params.id,
          organizationId: orgId
        },
        select: {
          id: true,
          clientId: true,
          quoteNumber: true,
          status: true,
          convertedAt: true
        }
      });

      if (!quote) {
        return null;
      }

      if (quote.status !== "ACCEPTED") {
        return "quote-not-accepted" as const;
      }

      const existingJob = await tx.job.findFirst({
        where: {
          organizationId: orgId,
          quoteId: quote.id
        },
        select: { id: true }
      });

      if (quote.convertedAt || existingJob) {
        return "already-converted" as const;
      }

      const createdJob = await tx.job.create({
        data: {
          organizationId: orgId,
          clientId: quote.clientId,
          quoteId: quote.id,
          title: parsed.data.title?.trim() ?? `Quote ${quote.quoteNumber}`,
          status: "SCHEDULED",
          scheduledAt: dateToNull(parsed.data.scheduledAt),
          location: emptyToNull(parsed.data.location),
          notes: emptyToNull(parsed.data.notes),
          photoUrls: []
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        }
      });

      await tx.quote.update({
        where: { id: quote.id },
        data: { convertedAt: new Date() }
      });

      return createdJob;
    });

    if (!job) {
      return notFound();
    }

    if (job === "quote-not-accepted") {
      return badRequest("Only accepted quotes can be converted to jobs.");
    }

    if (job === "already-converted") {
      return conflict("Quote has already been converted to a job.");
    }

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return conflict("Quote has already been converted to a job.");
    }

    console.error("Quote conversion failed", error);
    return serverError();
  }
}
