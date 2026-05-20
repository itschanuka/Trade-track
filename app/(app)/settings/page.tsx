import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { authOptions } from "@/lib/auth/authOptions";
import { getOrgAppUrl } from "@/lib/auth/organization-onboarding";
import { withOrgContext } from "@/lib/db/withOrgContext";
import { prisma } from "@/lib/prisma";

const TENANT_HEADER = "x-org-slug";

function valueOrEmpty(value: string | null) {
  return value ?? "";
}

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const orgSlug = headers().get(TENANT_HEADER);

  if (!session?.user?.id || !orgSlug) {
    notFound();
  }

  const organization = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true, slug: true }
  });

  if (!organization) {
    notFound();
  }

  const settings = await withOrgContext(organization.id, (tx) =>
    tx.organization.findFirst({
      where: { id: organization.id },
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

  if (!settings) {
    notFound();
  }

  const appBasePath = new URL(getOrgAppUrl(organization.slug)).pathname.replace(/\/$/, "");

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Settings</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Business settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Keep the active portfolio workflow focused on business profile, document defaults, and reminder preferences.
        </p>
      </div>
      <SettingsForm
        apiBasePath={appBasePath}
        initialValues={{
          address: valueOrEmpty(settings.address),
          defaultPaymentInstructions: valueOrEmpty(settings.defaultPaymentInstructions),
          defaultPaymentTerms: settings.defaultPaymentTerms,
          defaultQuoteExpiry: settings.defaultQuoteExpiry,
          defaultTaxRate: settings.defaultTaxRate,
          email: valueOrEmpty(settings.email),
          invoicePrefix: settings.invoicePrefix,
          name: settings.name,
          phone: valueOrEmpty(settings.phone),
          quotePrefix: settings.quotePrefix,
          registrationNo: valueOrEmpty(settings.registrationNo),
          reminderDay7: settings.reminderDay7,
          reminderDay14: settings.reminderDay14,
          reminderOverdue: settings.reminderOverdue,
          website: valueOrEmpty(settings.website)
        }}
      />
    </section>
  );
}
