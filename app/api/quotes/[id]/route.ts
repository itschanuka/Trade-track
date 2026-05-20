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

const StoredQuoteLineItemSchema = QuoteLineItemSchema.extend({
  lineTotal: z.coerce.number().min(0).optional()
});

const QuoteUpdateSchema = z
  .object({
    clientId: z.string().trim().min(1).max(128).optional(),
    status: QuoteStatusSchema.optional(),
    issueDate: z.string().datetime().optional().or(z.literal("")),
    expiryDate: z.string().datetime().optional().or(z.literal("")),
    lineItems: z.array(QuoteLineItemSchema).min(1).max(100).optional(),
    taxRate: z.coerce.number().min(0).max(100).optional(),
    notes: z.string().trim().max(2000).optional().or(z.literal(""))
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

type QuoteRouteParams = {
  params: {
    id: string;
  };
};

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

function handleOrgContextError(error: OrgContextError) {
  if (error.status === 401) {
    return unauthorized();
  }

  if (error.status === 403) {
    return forbidden();
  }

  return notFound();
}

export async function GET(req: NextRequest, { params }: QuoteRouteParams) {
  try {
    const { orgId } = await getOrgContext(req);

    const quote = await withOrgContext(orgId, (tx) =>
      tx.quote.findFirst({
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
      })
    );

    if (!quote) {
      return notFound();
    }

    return NextResponse.json({ quote });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Quote detail failed", error);
    return serverError();
  }
}

export async function PATCH(req: NextRequest, { params }: QuoteRouteParams) {
  try {
    const { orgId } = await getOrgContext(req);
    const parsed = QuoteUpdateSchema.safeParse(await req.json());

    if (!parsed.success) {
      return badRequest("Invalid quote details.");
    }

    const quote = await withOrgContext(orgId, async (tx) => {
      const existing = await tx.quote.findFirst({
        where: {
          id: params.id,
          organizationId: orgId
        },
        select: {
          id: true,
          clientId: true,
          lineItems: true,
          taxRate: true
        }
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

      const shouldRecalculate =
        parsed.data.lineItems !== undefined || parsed.data.taxRate !== undefined;
      const totals = shouldRecalculate
        ? calculateQuoteTotals(
            parsed.data.lineItems ?? StoredQuoteLineItemSchema.array().parse(existing.lineItems),
            parsed.data.taxRate ?? existing.taxRate
          )
        : null;

      return tx.quote.update({
        where: { id: existing.id },
        data: {
          ...(parsed.data.clientId !== undefined ? { clientId: parsed.data.clientId } : {}),
          ...(parsed.data.status !== undefined ? { status: parsed.data.status as QuoteStatus } : {}),
          ...(parsed.data.issueDate !== undefined
            ? { issueDate: dateToNull(parsed.data.issueDate) ?? new Date() }
            : {}),
          ...(parsed.data.expiryDate !== undefined
            ? { expiryDate: dateToNull(parsed.data.expiryDate) }
            : {}),
          ...(totals
            ? {
                lineItems: totals.lineItems,
                subtotal: totals.subtotal,
                taxRate: totals.taxRate,
                taxAmount: totals.taxAmount,
                total: totals.total
              }
            : {}),
          ...(parsed.data.notes !== undefined ? { notes: emptyToNull(parsed.data.notes) } : {})
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

    if (!quote || quote === "client-not-found") {
      return notFound();
    }

    return NextResponse.json({ quote });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Quote update failed", error);
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: QuoteRouteParams) {
  try {
    const { orgId, role } = await getOrgContext(req);

    if (role === "MEMBER") {
      return forbidden("Members cannot delete records.");
    }

    const quote = await withOrgContext(orgId, async (tx) => {
      const existing = await tx.quote.findFirst({
        where: {
          id: params.id,
          organizationId: orgId
        },
        select: { id: true }
      });

      if (!existing) {
        return null;
      }

      return tx.quote.delete({
        where: { id: existing.id }
      });
    });

    if (!quote) {
      return notFound();
    }

    return NextResponse.json({ quote });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Quote delete failed", error);
    return serverError();
  }
}
