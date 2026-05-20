import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { InvoicesManager } from "@/components/invoices/InvoicesManager";
import { authOptions } from "@/lib/auth/authOptions";
import { getOrgAppUrl } from "@/lib/auth/organization-onboarding";
import { withOrgContext } from "@/lib/db/withOrgContext";
import { prisma } from "@/lib/prisma";

const TENANT_HEADER = "x-org-slug";

export default async function InvoicesPage() {
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

  const membership = await withOrgContext(organization.id, (tx) =>
    tx.organizationMember.findFirst({
      where: {
        organizationId: organization.id,
        userId: session.user.id
      },
      select: { role: true }
    })
  );

  if (!membership) {
    notFound();
  }

  const apiBasePath = new URL(getOrgAppUrl(organization.slug)).pathname.replace(/\/$/, "");

  return <InvoicesManager apiBasePath={apiBasePath} />;
}
