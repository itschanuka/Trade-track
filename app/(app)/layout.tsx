import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { TenantAppShell } from "@/components/layout/TenantAppShell";
import { authOptions } from "@/lib/auth/authOptions";
import { getOrgAppUrl } from "@/lib/auth/organization-onboarding";
import { withOrgContext } from "@/lib/db/withOrgContext";
import { prisma } from "@/lib/prisma";

const TENANT_HEADER = "x-org-slug";

type TenantAppLayoutProps = {
  children: React.ReactNode;
};

export default async function TenantAppLayout({ children }: TenantAppLayoutProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const orgSlug = headers().get(TENANT_HEADER);

  if (!orgSlug) {
    notFound();
  }

  const organization = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true, isSuspended: true, name: true, slug: true }
  });

  if (!organization || organization.isSuspended) {
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

  const appBasePath = new URL(getOrgAppUrl(organization.slug)).pathname.replace(/\/$/, "");

  return (
    <TenantAppShell
      appBasePath={appBasePath}
      organization={{
        name: organization.name,
        slug: organization.slug
      }}
      role={membership.role}
    >
      {children}
    </TenantAppShell>
  );
}
