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
import { calculateInvoiceTotals } from "@/lib/invoices/calculations";

export const dynamic = "force-dynamic";

const InvoiceLineItemSchema = z
  .object({
    description: z.string().trim().min(1).max(240),
    quantity: z.coerce.number().positive().max(100000),
    unitPrice: z.coerce.number().min(0).max(10000000)
  })
  .strict();

const ConvertJobSchema = z
  .object({
    status: z.enum(["DRAFT", "SENT"]).optional(),
    issueDate: z.string().datetime().optional().or(z.literal("")),
    dueDate: z.string().datetime().optional().or(z.literal("")),
    lineItems: z.array(InvoiceLineItemSchema).min(1).max(100),
    taxRate: z.coerce.number().min(0).max(100).optional(),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    paymentInstructions: z.string().trim().max(2000).optional().or(z.literal(""))
  })
  .strict();

type ConvertJobRouteParams = {
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

function getDefaultDueDate(issueDate: Date, defaultPaymentTerms: number) {
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + defaultPaymentTerms);

  return dueDate;
}

function formatInvoiceNumber(prefix: string, nextNumber: number) {
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

export async function POST(req: NextRequest, { params }: ConvertJobRouteParams) {
  try {
    const { orgId } = await getOrgContext(req);
    const parsed = ConvertJobSchema.safeParse(await req.json());

    if (!parsed.success) {
      return badRequest("Invalid invoice conversion details.");
    }

    const invoice = await withOrgContext(orgId, async (tx) => {
      const job = await tx.job.findFirst({
        where: {
          id: params.id,
          organizationId: orgId
        },
        select: {
          clientId: true,
          id: true,
          invoiceId: true,
          title: true
        }
      });

      if (!job) {
        return null;
      }

      if (job.invoiceId) {
        return "already-invoiced" as const;
      }

      const organization = await tx.organization.findFirst({
        where: { id: orgId },
        select: {
          defaultPaymentInstructions: true,
          defaultPaymentTerms: true,
          defaultTaxRate: true,
          invoiceNextNumber: true,
          invoicePrefix: true,
        }
      });

      if (!organization) {
        return null;
      }

      const issueDate = dateToNull(parsed.data.issueDate) ?? new Date();
      const dueDate =
        dateToNull(parsed.data.dueDate) ??
        getDefaultDueDate(issueDate, organization.defaultPaymentTerms);
      const totals = calculateInvoiceTotals(
        parsed.data.lineItems,
        parsed.data.taxRate ?? organization.defaultTaxRate
      );
      const updatedOrganization = await tx.organization.update({
        where: { id: orgId },
        data: { invoiceNextNumber: { increment: 1 } },
        select: { invoiceNextNumber: true }
      });
      const invoiceNumber = formatInvoiceNumber(
        organization.invoicePrefix,
        updatedOrganization.invoiceNextNumber - 1
      );
      const status = parsed.data.status ?? "DRAFT";
      const createdInvoice = await tx.invoice.create({
        data: {
          organizationId: orgId,
          clientId: job.clientId,
          invoiceNumber,
          status,
          issueDate,
          dueDate,
          lineItems: totals.lineItems,
          subtotal: totals.subtotal,
          taxRate: totals.taxRate,
          taxAmount: totals.taxAmount,
          total: totals.total,
          amountPaid: totals.amountPaid,
          balance: totals.balance,
          notes: emptyToNull(parsed.data.notes) ?? `Created from job: ${job.title}`,
          paymentInstructions:
            emptyToNull(parsed.data.paymentInstructions) ??
            organization.defaultPaymentInstructions,
          sentAt: status === "SENT" ? new Date() : null
        }
      });

      await tx.job.update({
        where: { id: job.id },
        data: {
          invoiceId: createdInvoice.id,
          status: "INVOICED"
        }
      });

      return tx.invoice.findFirst({
        where: {
          id: createdInvoice.id,
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
          }
        }
      });
    });

    if (!invoice) {
      return notFound();
    }

    if (invoice === "already-invoiced") {
      return conflict("Job has already been converted to an invoice.");
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Job invoice conversion failed", error);
    return serverError();
  }
}
