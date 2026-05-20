import { z } from "zod";
import type { InvoiceStatus } from "@prisma/client";
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
import { calculateInvoiceTotals } from "@/lib/invoices/calculations";

export const dynamic = "force-dynamic";

const InvoiceStatusSchema = z.enum(["DRAFT", "SENT", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"]);

const InvoiceLineItemSchema = z
  .object({
    description: z.string().trim().min(1).max(240),
    quantity: z.coerce.number().positive().max(100000),
    unitPrice: z.coerce.number().min(0).max(10000000)
  })
  .strict();

const StoredInvoiceLineItemSchema = InvoiceLineItemSchema.extend({
  lineTotal: z.coerce.number().min(0).optional()
});

const InvoiceUpdateSchema = z
  .object({
    clientId: z.string().trim().min(1).max(128).optional(),
    status: InvoiceStatusSchema.optional(),
    issueDate: z.string().datetime().optional().or(z.literal("")),
    dueDate: z.string().datetime().optional().or(z.literal("")),
    lineItems: z.array(InvoiceLineItemSchema).min(1).max(100).optional(),
    taxRate: z.coerce.number().min(0).max(100).optional(),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    paymentInstructions: z.string().trim().max(2000).optional().or(z.literal(""))
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

type InvoiceRouteParams = {
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

export async function GET(req: NextRequest, { params }: InvoiceRouteParams) {
  try {
    const { orgId } = await getOrgContext(req);

    const invoice = await withOrgContext(orgId, (tx) =>
      tx.invoice.findFirst({
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
          job: {
            select: {
              id: true,
              title: true,
              status: true
            }
          },
          payments: {
            orderBy: { paidAt: "desc" }
          }
        }
      })
    );

    if (!invoice) {
      return notFound();
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Invoice detail failed", error);
    return serverError();
  }
}

export async function PATCH(req: NextRequest, { params }: InvoiceRouteParams) {
  try {
    const { orgId } = await getOrgContext(req);
    const parsed = InvoiceUpdateSchema.safeParse(await req.json());

    if (!parsed.success) {
      return badRequest("Invalid invoice details.");
    }

    const invoice = await withOrgContext(orgId, async (tx) => {
      const existing = await tx.invoice.findFirst({
        where: {
          id: params.id,
          organizationId: orgId
        },
        select: {
          amountPaid: true,
          id: true,
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
        ? calculateInvoiceTotals(
            parsed.data.lineItems ??
              StoredInvoiceLineItemSchema.array().parse(existing.lineItems),
            parsed.data.taxRate ?? existing.taxRate,
            existing.amountPaid
          )
        : null;

      return tx.invoice.update({
        where: { id: existing.id },
        data: {
          ...(parsed.data.clientId !== undefined ? { clientId: parsed.data.clientId } : {}),
          ...(parsed.data.status !== undefined
            ? {
                status: parsed.data.status as InvoiceStatus,
                ...(parsed.data.status === "SENT" ? { sentAt: new Date() } : {}),
                ...(parsed.data.status === "PAID" ? { paidAt: new Date() } : {})
              }
            : {}),
          ...(parsed.data.issueDate !== undefined
            ? { issueDate: dateToNull(parsed.data.issueDate) ?? new Date() }
            : {}),
          ...(parsed.data.dueDate !== undefined
            ? { dueDate: dateToNull(parsed.data.dueDate) }
            : {}),
          ...(totals
            ? {
                lineItems: totals.lineItems,
                subtotal: totals.subtotal,
                taxRate: totals.taxRate,
                taxAmount: totals.taxAmount,
                total: totals.total,
                amountPaid: totals.amountPaid,
                balance: totals.balance
              }
            : {}),
          ...(parsed.data.notes !== undefined ? { notes: emptyToNull(parsed.data.notes) } : {}),
          ...(parsed.data.paymentInstructions !== undefined
            ? { paymentInstructions: emptyToNull(parsed.data.paymentInstructions) }
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
          job: {
            select: {
              id: true,
              title: true,
              status: true
            }
          }
        }
      });
    });

    if (!invoice || invoice === "client-not-found") {
      return notFound();
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Invoice update failed", error);
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: InvoiceRouteParams) {
  try {
    const { orgId, role } = await getOrgContext(req);

    if (role === "MEMBER") {
      return forbidden("Members cannot delete records.");
    }

    const invoice = await withOrgContext(orgId, async (tx) => {
      const existing = await tx.invoice.findFirst({
        where: {
          id: params.id,
          organizationId: orgId
        },
        select: { id: true }
      });

      if (!existing) {
        return null;
      }

      await tx.job.updateMany({
        where: {
          invoiceId: existing.id,
          organizationId: orgId
        },
        data: {
          invoiceId: null,
          status: "COMPLETED"
        }
      });

      return tx.invoice.delete({
        where: { id: existing.id }
      });
    });

    if (!invoice) {
      return notFound();
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Invoice delete failed", error);
    return serverError();
  }
}
