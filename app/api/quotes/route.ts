import { z } from "zod";
import type { QuoteStatus } from "@prisma/client";
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

const QuoteStatusSchema = z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]);

const QuoteLineItemSchema = z
  .object({
    description: z.string().trim().min(1).max(240),
    quantity: z.coerce.number().positive().max(100000),
    unitPrice: z.coerce.number().min(0).max(10000000)
  })
  .strict();

const QuoteSchema = z
  .object({
    clientId: z.string().trim().min(1).max(128),
    status: QuoteStatusSchema.optional(),
    issueDate: z.string().datetime().optional().or(z.literal("")),
    expiryDate: z.string().datetime().optional().or(z.literal("")),
    lineItems: z.array(QuoteLineItemSchema).min(1).max(100),
    taxRate: z.coerce.number().min(0).max(100).optional(),
    notes: z.string().trim().max(2000).optional().or(z.literal(""))
  })
  .strict();

const QuoteListQuerySchema = z
  .object({
    status: QuoteStatusSchema.optional(),
    clientId: z.string().trim().min(1).max(128).optional(),
    search: z.string().trim().max(120).optional()
  })
  .strict();

type QuoteLineItem = z.infer<typeof QuoteLineItemSchema> & {
  lineTotal: number;
};

function emptyToNull(value: string | undefined) {
  return value?.trim() ? value.trim() : null;
}

function dateToNull(value: string | undefined) {
  return value?.trim() ? new Date(value) : null;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateQuoteTotals(
  lineItems: z.infer<typeof QuoteLineItemSchema>[],
  taxRate = 0
) {
  const normalizedLineItems: QuoteLineItem[] = lineItems.map((item) => {
    const quantity = roundMoney(item.quantity);
    const unitPrice = roundMoney(item.unitPrice);

    return {
      description: item.description.trim(),
      quantity,
      unitPrice,
      lineTotal: roundMoney(quantity * unitPrice)
    };
  });
  const subtotal = roundMoney(
    normalizedLineItems.reduce((sum, item) => sum + item.lineTotal, 0)
  );
  const normalizedTaxRate = roundMoney(taxRate);
  const taxAmount = roundMoney(subtotal * (normalizedTaxRate / 100));
  const total = roundMoney(subtotal + taxAmount);

  return {
    lineItems: normalizedLineItems,
    subtotal,
    taxRate: normalizedTaxRate,
    taxAmount,
    total
  };
}

function getDefaultExpiryDate(issueDate: Date, defaultQuoteExpiry: number) {
  const expiryDate = new Date(issueDate);
  expiryDate.setDate(expiryDate.getDate() + defaultQuoteExpiry);

  return expiryDate;
}

function formatQuoteNumber(prefix: string, nextNumber: number) {
  return `${prefix}${nextNumber.toString().padStart(5, "0")}`;
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
    const parsed = QuoteListQuerySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      clientId: url.searchParams.get("clientId") ?? undefined,
      search: url.searchParams.get("search") ?? undefined
    });

    if (!parsed.success) {
      return badRequest("Invalid quote filters.");
    }

    const { clientId, search, status } = parsed.data;
    const quotes = await withOrgContext(orgId, (tx) =>
      tx.quote.findMany({
        where: {
          organizationId: orgId,
          ...(status ? { status: status as QuoteStatus } : {}),
          ...(clientId ? { clientId } : {}),
          ...(search
            ? {
                OR: [
                  { quoteNumber: { contains: search, mode: "insensitive" } },
                  { notes: { contains: search, mode: "insensitive" } },
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
          jobs: {
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true
            },
            orderBy: { createdAt: "desc" }
          }
        },
        orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }]
      })
    );

    return NextResponse.json({ quotes });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Quote list failed", error);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await getOrgContext(req);
    const parsed = QuoteSchema.safeParse(await req.json());

    if (!parsed.success) {
      return badRequest("Invalid quote details.");
    }

    const quote = await withOrgContext(orgId, async (tx) => {
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

      const organization = await tx.organization.findFirst({
        where: { id: orgId },
        select: {
          quotePrefix: true,
          quoteNextNumber: true,
          defaultQuoteExpiry: true,
          defaultTaxRate: true
        }
      });

      if (!organization) {
        return null;
      }

      const issueDate = dateToNull(parsed.data.issueDate) ?? new Date();
      const expiryDate =
        dateToNull(parsed.data.expiryDate) ??
        getDefaultExpiryDate(issueDate, organization.defaultQuoteExpiry);
      const totals = calculateQuoteTotals(
        parsed.data.lineItems,
        parsed.data.taxRate ?? organization.defaultTaxRate
      );
      const updatedOrganization = await tx.organization.update({
        where: { id: orgId },
        data: { quoteNextNumber: { increment: 1 } },
        select: { quoteNextNumber: true }
      });
      const quoteNumber = formatQuoteNumber(
        organization.quotePrefix,
        updatedOrganization.quoteNextNumber - 1
      );

      return tx.quote.create({
        data: {
          organizationId: orgId,
          clientId: client.id,
          quoteNumber,
          status: (parsed.data.status ?? "DRAFT") as QuoteStatus,
          issueDate,
          expiryDate,
          lineItems: totals.lineItems,
          subtotal: totals.subtotal,
          taxRate: totals.taxRate,
          taxAmount: totals.taxAmount,
          total: totals.total,
          notes: emptyToNull(parsed.data.notes)
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
          jobs: {
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true
            },
            orderBy: { createdAt: "desc" }
          }
        }
      });
    });

    if (!quote) {
      return notFound();
    }

    return NextResponse.json({ quote }, { status: 201 });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Quote create failed", error);
    return serverError();
  }
}
