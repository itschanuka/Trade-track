import { z } from "zod";
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
import { calculateInvoiceBalance, roundMoney } from "@/lib/invoices/calculations";

export const dynamic = "force-dynamic";

const PaymentSchema = z
  .object({
    amount: z.coerce.number().positive().max(10000000),
    method: z.string().trim().max(80).optional().or(z.literal("")),
    reference: z.string().trim().max(160).optional().or(z.literal("")),
    paidAt: z.string().datetime().optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal(""))
  })
  .strict();

type InvoicePaymentRouteParams = {
  params: {
    id: string;
  };
};

function emptyToNull(value: string | undefined) {
  return value?.trim() ? value.trim() : null;
}

function dateOrNow(value: string | undefined) {
  return value?.trim() ? new Date(value) : new Date();
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

export async function POST(req: NextRequest, { params }: InvoicePaymentRouteParams) {
  try {
    const { orgId } = await getOrgContext(req);
    const parsed = PaymentSchema.safeParse(await req.json());

    if (!parsed.success) {
      return badRequest("Invalid payment details.");
    }

    const result = await withOrgContext(orgId, async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: {
          id: params.id,
          organizationId: orgId
        },
        select: {
          amountPaid: true,
          balance: true,
          id: true,
          total: true
        }
      });

      if (!invoice) {
        return null;
      }

      const amount = roundMoney(parsed.data.amount);
      const currentBalance = roundMoney(invoice.balance);

      if (amount > currentBalance) {
        return "overpayment" as const;
      }

      if (currentBalance <= 0) {
        return "already-paid" as const;
      }

      const paidAt = dateOrNow(parsed.data.paidAt);
      const amountPaid = roundMoney(invoice.amountPaid + amount);
      const balance = calculateInvoiceBalance(invoice.total, amountPaid);
      const isFullyPaid = balance === 0;

      const payment = await tx.invoicePayment.create({
        data: {
          organizationId: orgId,
          invoiceId: invoice.id,
          amount,
          method: emptyToNull(parsed.data.method),
          reference: emptyToNull(parsed.data.reference),
          paidAt,
          notes: emptyToNull(parsed.data.notes)
        }
      });

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid,
          balance,
          status: isFullyPaid ? "PAID" : "PARTIAL",
          paidAt: isFullyPaid ? paidAt : null
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
      });

      return { invoice: updatedInvoice, payment };
    });

    if (!result) {
      return notFound();
    }

    if (result === "overpayment") {
      return conflict("Payment exceeds the invoice balance.");
    }

    if (result === "already-paid") {
      return conflict("Invoice is already paid.");
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Invoice payment failed", error);
    return serverError();
  }
}
