import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/api/errors";
import { getOrgContext, OrgContextError } from "@/lib/api/withOrg";
import { withOrgContext } from "@/lib/db/withOrgContext";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { renderInvoiceHtml } from "@/lib/pdf/html";
import { parsePdfLineItems } from "@/lib/pdf/line-items";
import { getPdfStoragePath, uploadPdfAndCreateSignedUrl } from "@/lib/supabase/pdf-storage";

export const dynamic = "force-dynamic";

type InvoicePdfRouteParams = {
  params: {
    id: string;
  };
};

function handleOrgContextError(error: OrgContextError) {
  if (error.status === 401) {
    return unauthorized();
  }

  if (error.status === 403) {
    return forbidden();
  }

  return notFound();
}

export async function POST(req: NextRequest, { params }: InvoicePdfRouteParams) {
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
              address: true,
              email: true,
              name: true,
              phone: true
            }
          },
          organization: {
            select: {
              address: true,
              defaultPaymentInstructions: true,
              email: true,
              logoUrl: true,
              name: true,
              phone: true,
              registrationNo: true,
              website: true
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

    const html = renderInvoiceHtml({
      client: invoice.client,
      invoice: {
        amountPaid: invoice.amountPaid,
        balance: invoice.balance,
        dueDate: invoice.dueDate,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        lineItems: parsePdfLineItems(invoice.lineItems),
        notes: invoice.notes,
        paymentInstructions: invoice.paymentInstructions,
        status: invoice.status,
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        taxRate: invoice.taxRate,
        total: invoice.total
      },
      organization: invoice.organization
    });
    const pdfBuffer = await generatePdfBuffer(html);
    const storageKey = getPdfStoragePath(orgId, "invoice", invoice.id);
    const signedUrl = await uploadPdfAndCreateSignedUrl(storageKey, pdfBuffer);

    return NextResponse.json(signedUrl);
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Invoice PDF generation failed", error);
    return serverError();
  }
}
