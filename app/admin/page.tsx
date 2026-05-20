import Link from "next/link";
import { formatCurrency, formatDate, formatStatus } from "./admin-format";
import { EmptyState, MetricCard, SectionHeader, StatusBadge } from "./AdminUi";
import { adminPrisma } from "@/lib/db/adminPrisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [
    totalOrganizations,
    activeOrganizations,
    suspendedOrganizations,
    totalUsers,
    totalClients,
    totalJobs,
    totalQuotes,
    totalInvoices,
    invoiceTotals,
    recentOrganizations,
    recentUsers,
    recentInvoices,
    recentQuotes
  ] = await Promise.all([
    adminPrisma.organization.count(),
    adminPrisma.organization.count({ where: { isSuspended: false } }),
    adminPrisma.organization.count({ where: { isSuspended: true } }),
    adminPrisma.user.count(),
    adminPrisma.client.count({ where: { isActive: true } }),
    adminPrisma.job.count(),
    adminPrisma.quote.count(),
    adminPrisma.invoice.count(),
    adminPrisma.invoice.aggregate({
      _sum: {
        amountPaid: true,
        balance: true,
        total: true
      },
      where: { status: { not: "CANCELLED" } }
    }),
    adminPrisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        id: true,
        isSuspended: true,
        name: true,
        slug: true,
        _count: {
          select: {
            clients: true,
            invoices: true,
            jobs: true,
            members: true,
            quotes: true
          }
        }
      },
      take: 5
    }),
    adminPrisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        email: true,
        emailVerified: true,
        id: true,
        name: true,
        memberships: {
          select: {
            organization: {
              select: {
                isSuspended: true,
                name: true,
                slug: true
              }
            }
          },
          take: 1
        }
      },
      take: 5
    }),
    adminPrisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        balance: true,
        createdAt: true,
        id: true,
        invoiceNumber: true,
        status: true,
        total: true,
        client: { select: { name: true } },
        organization: { select: { name: true, slug: true } }
      },
      take: 5
    }),
    adminPrisma.quote.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        id: true,
        quoteNumber: true,
        status: true,
        total: true,
        client: { select: { name: true } },
        organization: { select: { name: true, slug: true } }
      },
      take: 5
    })
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Admin</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Platform overview
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Operational visibility across organizations, users, and the active TradeTrack workflow.
          </p>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total organizations" value={totalOrganizations} />
        <MetricCard label="Active organizations" value={activeOrganizations} />
        <MetricCard label="Suspended organizations" value={suspendedOrganizations} />
        <MetricCard label="Total users" value={totalUsers} />
        <MetricCard label="Total clients" value={totalClients} />
        <MetricCard label="Total jobs" value={totalJobs} />
        <MetricCard label="Total quotes" value={totalQuotes} />
        <MetricCard label="Total invoices" value={totalInvoices} />
        <MetricCard label="Total invoice value" value={formatCurrency(invoiceTotals._sum.total)} />
        <MetricCard label="Total paid amount" value={formatCurrency(invoiceTotals._sum.amountPaid)} />
        <MetricCard label="Outstanding balance" value={formatCurrency(invoiceTotals._sum.balance)} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <SectionHeader actionHref="/admin/organizations" actionLabel="View all" title="Recent organizations">
            Newest tenants and their active workflow footprint.
          </SectionHeader>
          {recentOrganizations.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No organizations yet">Organizations will appear here after signup or seeding.</EmptyState>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {recentOrganizations.map((organization) => (
                <Link
                  className="grid gap-3 p-4 transition hover:bg-slate-50 sm:grid-cols-[1fr_auto]"
                  href={`/admin/organizations/${organization.id}`}
                  key={organization.id}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">{organization.name}</p>
                      <StatusBadge suspended={organization.isSuspended} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{organization.slug}</p>
                  </div>
                  <div className="text-sm text-slate-600 sm:text-right">
                    <p>{organization._count.members} users</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {organization._count.clients} clients, {organization._count.jobs} jobs,{" "}
                      {organization._count.quotes} quotes, {organization._count.invoices} invoices
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <SectionHeader actionHref="/admin/users" actionLabel="View all" title="Recent users">
            Safe account overview without auth internals.
          </SectionHeader>
          {recentUsers.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No users yet">User accounts will appear here after signup or seeding.</EmptyState>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {recentUsers.map((user) => {
                const organization = user.memberships[0]?.organization;

                return (
                  <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]" key={user.id}>
                    <div>
                      <p className="font-semibold text-slate-950">{user.email}</p>
                      <p className="mt-1 text-sm text-slate-500">{user.name || "No name"}</p>
                    </div>
                    <div className="text-sm text-slate-600 sm:text-right">
                      <p>{user.emailVerified ? "Verified" : "Not verified"}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {organization ? `${organization.name} (${organization.slug})` : "No organization"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <SectionHeader title="Recent invoices">Latest invoice activity across all organizations.</SectionHeader>
          {recentInvoices.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No invoices yet">Invoices will appear here when tenants create them.</EmptyState>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {recentInvoices.map((invoice) => (
                <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]" key={invoice.id}>
                  <div>
                    <p className="font-semibold text-slate-950">{invoice.invoiceNumber}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {invoice.client.name} at {invoice.organization.name}
                    </p>
                  </div>
                  <div className="text-sm text-slate-600 sm:text-right">
                    <p>{formatCurrency(invoice.total)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatStatus(invoice.status)} - balance {formatCurrency(invoice.balance)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <SectionHeader title="Recent quotes">Latest quote activity across all organizations.</SectionHeader>
          {recentQuotes.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No quotes yet">Quotes will appear here when tenants create them.</EmptyState>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {recentQuotes.map((quote) => (
                <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]" key={quote.id}>
                  <div>
                    <p className="font-semibold text-slate-950">{quote.quoteNumber}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {quote.client.name} at {quote.organization.name}
                    </p>
                  </div>
                  <div className="text-sm text-slate-600 sm:text-right">
                    <p>{formatCurrency(quote.total)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatStatus(quote.status)} - {formatDate(quote.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
