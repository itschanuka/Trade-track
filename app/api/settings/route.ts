import { z } from "zod";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api/errors";
import { getOrgContext, OrgContextError } from "@/lib/api/withOrg";
import { withOrgContext } from "@/lib/db/withOrgContext";

export const dynamic = "force-dynamic";

const SettingsSchema = z
  .object({
    address: z.string().trim().max(500).optional().or(z.literal("")),
    defaultPaymentInstructions: z.string().trim().max(2000).optional().or(z.literal("")),
    defaultPaymentTerms: z.coerce.number().int().min(0).max(365),
    defaultQuoteExpiry: z.coerce.number().int().min(0).max(365),
    defaultTaxRate: z.coerce.number().min(0).max(100),
    email: z.string().trim().email().max(160).optional().or(z.literal("")),
    invoicePrefix: z.string().trim().min(1).max(12),
    name: z.string().trim().min(1).max(120),
    phone: z.string().trim().max(60).optional().or(z.literal("")),
    quotePrefix: z.string().trim().min(1).max(12),
    registrationNo: z.string().trim().max(80).optional().or(z.literal("")),
    reminderDay7: z.boolean(),
    reminderDay14: z.boolean(),
    reminderOverdue: z.boolean(),
    website: z.string().trim().max(160).optional().or(z.literal(""))
  })
  .strict();

function emptyToNull(value: string | undefined) {
  return value?.trim() ? value.trim() : null;
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

export async function PATCH(req: NextRequest) {
  try {
    const { orgId, role } = await getOrgContext(req);

    if (role === "MEMBER") {
      return forbidden("Members cannot change organization settings.");
    }

    const parsed = SettingsSchema.safeParse(await req.json());

    if (!parsed.success) {
      return badRequest("Invalid settings details.");
    }

    const organization = await withOrgContext(orgId, (tx) =>
      tx.organization.update({
        where: { id: orgId },
        data: {
          address: emptyToNull(parsed.data.address),
          defaultPaymentInstructions: emptyToNull(parsed.data.defaultPaymentInstructions),
          defaultPaymentTerms: parsed.data.defaultPaymentTerms,
          defaultQuoteExpiry: parsed.data.defaultQuoteExpiry,
          defaultTaxRate: parsed.data.defaultTaxRate,
          email: emptyToNull(parsed.data.email),
          invoicePrefix: parsed.data.invoicePrefix.trim(),
          name: parsed.data.name.trim(),
          phone: emptyToNull(parsed.data.phone),
          quotePrefix: parsed.data.quotePrefix.trim(),
          registrationNo: emptyToNull(parsed.data.registrationNo),
          reminderDay7: parsed.data.reminderDay7,
          reminderDay14: parsed.data.reminderDay14,
          reminderOverdue: parsed.data.reminderOverdue,
          website: emptyToNull(parsed.data.website)
        },
        select: {
          address: true,
          defaultPaymentInstructions: true,
          defaultPaymentTerms: true,
          defaultQuoteExpiry: true,
          defaultTaxRate: true,
          email: true,
          invoicePrefix: true,
          name: true,
          phone: true,
          quotePrefix: true,
          registrationNo: true,
          reminderDay7: true,
          reminderDay14: true,
          reminderOverdue: true,
          website: true
        }
      })
    );

    return NextResponse.json({
      organization: {
        ...organization,
        address: organization.address ?? "",
        defaultPaymentInstructions: organization.defaultPaymentInstructions ?? "",
        email: organization.email ?? "",
        phone: organization.phone ?? "",
        registrationNo: organization.registrationNo ?? "",
        website: organization.website ?? ""
      }
    });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Settings update failed", error);
    return serverError();
  }
}
