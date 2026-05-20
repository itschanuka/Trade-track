import { notFound } from "next/navigation";
import { setOrganizationSuspension } from "../../actions";
import { formatCurrency, formatDate, formatStatus } from "../../admin-format";
import { ConfirmSubmitButton } from "../../ConfirmSubmitButton";
import { EmptyState, MetricCard, SectionHeader, StatusBadge } from "../../AdminUi";
import { adminPrisma } from "@/lib/db/adminPrisma";

export const dynamic = "force-dynamic";

type AdminOrganizationDetailPageProps = {
  params: {
    id: string;
  };
};

function SummaryList({
  empty,
  items
}: {
  empty: string;
  items: Array<{ id: string; primary: string; secondary: string }>;
}) {
  if (items.length === 0) {
    return <EmptyState title={empty}>No matching records exist for this organization yet.</EmptyState>;
  }

  return (
    <div className="divide-y divide-slate-200">
      {items.map((item) => (
        <div className="px-4 py-3 text-sm" key={item.id}>
          <p className="font-medium text-slate-950">{item.primary}</p>
          <p className="mt-1 text-xs text-slate-500">{item.secondary}</p>
        </div>
      ))}
    </div>
  );
}

export default async function AdminOrganizationDetailPage({
  params
}: AdminOrganizationDetailPageProps) {
  const [organization, invoiceTotals, paymentTotals] = await Promise.all([
    adminPrisma.organization.findUnique({
      where: { id: params.id },
      select: {
        address: true,
        createdAt: true,
        email: true,
        id: true,
        isSuspended: true,
        name: true,
        phone: true,
        slug: true,
        website: true,
        _count: {
          select: {
            clients: true,
            invoices: true,
            jobs: true,
            members: true,
            quotes: true
          }
        },
        clients: {
          orderBy: { createdAt: "desc" },
          select: { createdAt: true, email: true, id: true, name: true },
          take: 8
        },
        invoices: {
          orderBy: { createdAt: "desc" },
          select: {
            amountPaid: true,
            balance: true,
            createdAt: true,
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            client: { select: { name: true } },
            job: { select: { title: true } }
          },
          take: 8
        },
        jobs: {
          orderBy: { createdAt: "desc" },
          select: {
            client: { select: { name: true } },
            createdAt: true,
            id: true,
            status: true,
            title: true
          },
          take: 8
        },
        members: {
          orderBy: { joinedAt: "asc" },
          select: {
            id: true,
            joinedAt: true,
            role: true,
            user: {
              select: {
                email: true,
                emailVerified: true,
                id: true,
                name: true
              }
            }
          }
        },
        quotes: {
          orderBy: { createdAt: "desc" },
          select: {
            client: { select: { name: true } },
            convertedAt: true,
            createdAt: true,
            id: true,
            quoteNumber: true,
            status: true,
            total: true
          },
          take: 8
        }
      }
    }),
    adminPrisma.invoice.aggregate({
      _sum: {
        amountPaid: true,
        balance: true,
        total: true
      },
      where: {
        organizationId: params.id,
        status: { not: "CANCELLED" }
      }
    }),
    adminPrisma.invoicePayment.aggregate({
      _sum: { amount: true },
      where: { organizationId: params.id }
    })
  ]);

  if (!organization) {
    notFound();
  }

  const activity = [
    ...organization.clients.map((client) => ({
      createdAt: client.createdAt,
      id: `client-${client.id}`,
      label: `Client created: ${client.name}`
    })),
    ...organization.jobs.map((job) => ({
      createdAt: job.createdAt,
      id: `job-${job.id}`,
      label: `Job ${formatStatus(job.status)}: ${job.title}`
    })),
    ...organization.quotes.map((quote) => ({
      createdAt: quote.createdAt,
      id: `quote-${quote.id}`,
      label: `Quote ${formatStatus(quote.status)}: ${quote.quoteNumber}`
    })),
    ...organization.invoices.map((invoice) => ({
      createdAt: invoice.createdAt,
      id: `invoice-${invoice.id}`,
      label: `Invoice ${formatStatus(invoice.status)}: ${invoice.invoiceNumber}`
    }))
  ]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Organization</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {organization.name}
            </h1>
            <StatusBadge suspended={organization.isSuspended} />
          </div>
          <p className="mt-2 text-sm text-slate-600">{organization.slug}</p>
        </div>
        <form action={setOrganizationSuspension}>
          <input name="organizationId" type="hidden" value={organization.id} />
          <input
            name="isSuspended"
            type="hidden"
            value={organization.isSuspended ? "false" : "true"}
          />
          <ConfirmSubmitButton
            confirmMessage={`${organization.isSuspended ? "Unsuspend" : "Suspend"} ${organization.name}?`}
            tone={organization.isSuspended ? "neutral" : "danger"}
          >
            {organization.isSuspended ? "Unsuspend organization" : "Suspend organization"}
          </ConfirmSubmitButton>
        </form>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Linked users" value={organization._count.members} />
        <MetricCard label="Clients" value={organization._count.clients} />
        <MetricCard label="Jobs" value={organization._count.jobs} />
        <MetricCard label="Quotes" value={organization._count.quotes} />
        <MetricCard label="Invoices" value={organization._count.invoices} />
        <MetricCard label="Invoice value" value={formatCurrency(invoiceTotals._sum.total)} />
        <MetricCard label="Paid amount" value={formatCurrency(invoiceTotals._sum.amountPaid)} />
        <MetricCard label="Outstanding" value={formatCurrency(invoiceTotals._sum.balance)} />
      </section>

      <section className="rounded-md border border-slate-200 bg-white shadow-sm">
        <SectionHeader title="Organization summary">Contact and payment summary for this tenant.</SectionHeader>
        <dl className="grid gap-4 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="font-medium text-slate-500">Created</dt>
            <dd className="mt-1 text-slate-900">{formatDate(organization.createdAt)}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Email</dt>
            <dd className="mt-1 text-slate-900">{organization.email ?? "Not set"}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Phone</dt>
            <dd className="mt-1 text-slate-900">{organization.phone ?? "Not set"}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Payments recorded</dt>
            <dd className="mt-1 text-slate-900">{formatCurrency(paymentTotals._sum.amount)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-slate-500">Address</dt>
            <dd className="mt-1 text-slate-900">{organization.address ?? "Not set"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-slate-500">Website</dt>
            <dd className="mt-1 text-slate-900">{organization.website ?? "Not set"}</dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <SectionHeader title="Linked users">Names, emails, roles, and verification status only.</SectionHeader>
          <SummaryList
            empty="No linked users"
            items={organization.members.map((member) => ({
              id: member.id,
              primary: member.user.email,
              secondary: `${member.user.name || "No name"} - ${formatStatus(member.role)} - ${
                member.user.emailVerified ? "verified" : "not verified"
              }`
            }))}
          />
        </section>

        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <SectionHeader title="Recent activity">Built from recently created clients, jobs, quotes, and invoices.</SectionHeader>
          <SummaryList
            empty="No recent activity"
            items={activity.map((item) => ({
              id: item.id,
              primary: item.label,
              secondary: formatDate(item.createdAt)
            }))}
          />
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <SectionHeader title="Clients">Most recent active and inactive client records.</SectionHeader>
          <SummaryList
            empty="No clients"
            items={organization.clients.map((client) => ({
              id: client.id,
              primary: client.name,
              secondary: `${client.email ?? "No email"} - ${formatDate(client.createdAt)}`
            }))}
          />
        </section>

        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <SectionHeader title="Jobs">Recent jobs with linked client names.</SectionHeader>
          <SummaryList
            empty="No jobs"
            items={organization.jobs.map((job) => ({
              id: job.id,
              primary: job.title,
              secondary: `${job.client.name} - ${formatStatus(job.status)} - ${formatDate(job.createdAt)}`
            }))}
          />
        </section>

        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <SectionHeader title="Quotes">Recent quote totals and conversion state.</SectionHeader>
          <SummaryList
            empty="No quotes"
            items={organization.quotes.map((quote) => ({
              id: quote.id,
              primary: `${quote.quoteNumber} - ${formatCurrency(quote.total)}`,
              secondary: `${quote.client.name} - ${formatStatus(quote.status)} - ${
                quote.convertedAt ? "converted" : "not converted"
              }`
            }))}
          />
        </section>

        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <SectionHeader title="Invoices">Recent invoice totals, payments, balances, and job references.</SectionHeader>
          <SummaryList
            empty="No invoices"
            items={organization.invoices.map((invoice) => ({
              id: invoice.id,
              primary: `${invoice.invoiceNumber} - ${formatCurrency(invoice.total)}`,
              secondary: `${invoice.client.name} - paid ${formatCurrency(
                invoice.amountPaid
              )} - balance ${formatCurrency(invoice.balance)}${
                invoice.job ? ` - job ${invoice.job.title}` : ""
              }`
            }))}
          />
        </section>
      </div>
    </div>
  );
}
