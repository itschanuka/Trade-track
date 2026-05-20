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

const InvoiceSchema = z
  .object({
    clientId: z.string().trim().min(1).max(128),
    status: InvoiceStatusSchema.optional(),
    issueDate: z.string().datetime().optional().or(z.literal("")),
    dueDate: z.string().datetime().optional().or(z.literal("")),
    lineItems: z.array(InvoiceLineItemSchema).min(1).max(100),
    taxRate: z.coerce.number().min(0).max(100).optional(),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    paymentInstructions: z.string().trim().max(2000).optional().or(z.literal(""))
  })
  .strict();

const InvoiceListQuerySchema = z
  .object({
    status: InvoiceStatusSchema.optional(),
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

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await getOrgContext(req);
    const url = new URL(req.url);
    const parsed = InvoiceListQuerySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      clientId: url.searchParams.get("clientId") ?? undefined,
      search: url.searchParams.get("search") ?? undefined
    });

    if (!parsed.success) {
      return badRequest("Invalid invoice filters.");
    }

    const { clientId, search, status } = parsed.data;
    const invoices = await withOrgContext(orgId, (tx) =>
      tx.invoice.findMany({
        where: {
          organizationId: orgId,
          ...(status ? { status: status as InvoiceStatus } : {}),
          ...(clientId ? { clientId } : {}),
          ...(search
            ? {
                OR: [
                  { invoiceNumber: { contains: search, mode: "insensitive" } },
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
          job: {
            select: {
              id: true,
              title: true,
              status: true
            }
          }
        },
        orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }]
      })
    );

    return NextResponse.json({ invoices });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Invoice list failed", error);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await getOrgContext(req);
    const parsed = InvoiceSchema.safeParse(await req.json());

    if (!parsed.success) {
      return badRequest("Invalid invoice details.");
    }

    const invoice = await withOrgContext(orgId, async (tx) => {
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
      const status = (parsed.data.status ?? "DRAFT") as InvoiceStatus;

      return tx.invoice.create({
        data: {
          organizationId: orgId,
          clientId: client.id,
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
          notes: emptyToNull(parsed.data.notes),
          paymentInstructions:
            emptyToNull(parsed.data.paymentInstructions) ??
            organization.defaultPaymentInstructions,
          sentAt: status === "SENT" ? new Date() : null,
          paidAt: status === "PAID" ? new Date() : null
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
    });

    if (!invoice) {
      return notFound();
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Invoice create failed", error);
    return serverError();
  }
}
