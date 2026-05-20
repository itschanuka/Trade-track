import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/api/errors";
import { getOrgContext, OrgContextError } from "@/lib/api/withOrg";
import { withOrgContext } from "@/lib/db/withOrgContext";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { renderQuoteHtml } from "@/lib/pdf/html";
import { parsePdfLineItems } from "@/lib/pdf/line-items";
import { getPdfStoragePath, uploadPdfAndCreateSignedUrl } from "@/lib/supabase/pdf-storage";

export const dynamic = "force-dynamic";

type QuotePdfRouteParams = {
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

export async function POST(req: NextRequest, { params }: QuotePdfRouteParams) {
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
          }
        }
      })
    );

    if (!quote) {
      return notFound();
    }

    const html = renderQuoteHtml({
      client: quote.client,
      organization: quote.organization,
      quote: {
        expiryDate: quote.expiryDate,
        issueDate: quote.issueDate,
        lineItems: parsePdfLineItems(quote.lineItems),
        notes: quote.notes,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        subtotal: quote.subtotal,
        taxAmount: quote.taxAmount,
        taxRate: quote.taxRate,
        total: quote.total
      }
    });
    const pdfBuffer = await generatePdfBuffer(html);
    const storageKey = getPdfStoragePath(orgId, "quote", quote.id);
    const signedUrl = await uploadPdfAndCreateSignedUrl(storageKey, pdfBuffer);

    return NextResponse.json(signedUrl);
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Quote PDF generation failed", error);
    return serverError();
  }
}
