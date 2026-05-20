import Link from "next/link";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  DollarSign,
  FileText,
  ReceiptText,
  Send
} from "lucide-react";
import type { InvoiceStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth/authOptions";
import { getOrgAppUrl } from "@/lib/auth/organization-onboarding";
import { withOrgContext } from "@/lib/db/withOrgContext";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

const TENANT_HEADER = "x-org-slug";
const FOLLOW_UP_DAYS = 7;
const STALE_QUOTE_DAYS = 14;

type ActionItem = {
  id: string;
  title: string;
  meta: string;
  amount?: number;
  href: string;
  tone: "amber" | "blue" | "red" | "slate";
};

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function startOfNextMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 1);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency"
  }).format(value);
}

function formatDate(value: Date | string | null) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short"
  });
}

function formatStatus(status: InvoiceStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function withBasePath(appBasePath: string, href: string) {
  return `${appBasePath}${href}`;
}

function EmptyState({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{children}</p>
    </div>
  );
}

function ActionCard({ action }: { action: ActionItem }) {
  const tone = {
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    red: "border-red-200 bg-red-50 text-red-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600"
  }[action.tone];

  return (
    <Link
      className="block rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
      href={action.href}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{action.title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{action.meta}</p>
        </div>
        <span className={cn("shrink-0 rounded-md border px-2 py-1 text-xs font-medium", tone)}>
          {action.amount !== undefined ? formatCurrency(action.amount) : "Open"}
        </span>
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const orgSlug = headers().get(TENANT_HEADER);

  if (!session?.user?.id || !orgSlug) {
    notFound();
  }

  const organization = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true, name: true, slug: true }
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

  const now = new Date();
  const monthStart = startOfMonth(now);
  const nextMonthStart = startOfNextMonth(now);
  const followUpCutoff = daysAgo(FOLLOW_UP_DAYS);
  const staleQuoteCutoff = daysAgo(STALE_QUOTE_DAYS);
  const upcomingCutoff = addDays(now, 14);
  const appBasePath = new URL(getOrgAppUrl(organization.slug)).pathname.replace(/\/$/, "");

  const data = await withOrgContext(organization.id, async (tx) => {
    const [
      invoicedThisMonth,
      collectedThisMonth,
      outstandingBalance,
      overdueInvoices,
      followUpInvoices,
      staleQuotes,
      upcomingJobs,
      activeClientCount,
      recentClients,
      recentInvoices,
      recentQuotes
    ] = await Promise.all([
      tx.invoice.aggregate({
        _sum: { total: true },
        where: {
          organizationId: organization.id,
          issueDate: { gte: monthStart, lt: nextMonthStart },
          status: { not: "CANCELLED" }
        }
      }),
      tx.invoicePayment.aggregate({
        _sum: { amount: true },
        where: {
          organizationId: organization.id,
          paidAt: { gte: monthStart, lt: nextMonthStart }
        }
      }),
      tx.invoice.aggregate({
        _sum: { balance: true },
        where: {
          organizationId: organization.id,
          balance: { gt: 0 },
          status: { in: ["SENT", "PARTIAL", "OVERDUE"] }
        }
      }),
      tx.invoice.findMany({
        where: {
          organizationId: organization.id,
          balance: { gt: 0 },
          dueDate: { lt: now },
          status: { in: ["SENT", "PARTIAL", "OVERDUE"] }
        },
        include: {
          client: {
            select: { name: true }
          }
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
        take: 5
      }),
      tx.invoice.findMany({
        where: {
          organizationId: organization.id,
          balance: { gt: 0 },
          sentAt: { lte: followUpCutoff },
          status: "SENT",
          OR: [{ dueDate: null }, { dueDate: { gte: now } }]
        },
        include: {
          client: {
            select: { name: true }
          }
        },
        orderBy: [{ sentAt: "asc" }, { createdAt: "asc" }],
        take: 5
      }),
      tx.quote.findMany({
        where: {
          organizationId: organization.id,
          convertedAt: null,
          issueDate: { lte: staleQuoteCutoff },
          status: "SENT"
        },
        include: {
          client: {
            select: { name: true }
          }
        },
        orderBy: [{ issueDate: "asc" }, { createdAt: "asc" }],
        take: 5
      }),
      tx.job.findMany({
        where: {
          organizationId: organization.id,
          scheduledAt: { gte: now, lte: upcomingCutoff },
          status: { in: ["SCHEDULED", "IN_PROGRESS"] }
        },
        include: {
          client: {
            select: { name: true }
          }
        },
        orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
        take: 6
      }),
      tx.client.count({
        where: {
          organizationId: organization.id,
          isActive: true
        }
      }),
      tx.client.findMany({
        where: {
          organizationId: organization.id,
          isActive: true
        },
        orderBy: { createdAt: "desc" },
        take: 4
      }),
      tx.invoice.findMany({
        where: {
          organizationId: organization.id,
          status: { not: "CANCELLED" }
        },
        include: {
          client: {
            select: { name: true }
          },
          job: {
            select: { title: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 4
      }),
      tx.quote.findMany({
        where: {
          organizationId: organization.id
        },
        include: {
          client: {
            select: { name: true }
          },
          jobs: {
            select: { title: true },
            orderBy: { createdAt: "desc" },
            take: 1
          }
        },
        orderBy: { createdAt: "desc" },
        take: 4
      })
    ]);

    return {
      activeClientCount,
      collectedThisMonth: collectedThisMonth._sum.amount ?? 0,
      followUpInvoices,
      invoicedThisMonth: invoicedThisMonth._sum.total ?? 0,
      outstandingBalance: outstandingBalance._sum.balance ?? 0,
      overdueInvoices,
      recentClients,
      recentInvoices,
      recentQuotes,
      staleQuotes,
      upcomingJobs
    };
  });

  const actions: ActionItem[] = [
    ...data.overdueInvoices.map((invoice) => ({
      amount: invoice.balance,
      href: withBasePath(appBasePath, "/invoices"),
      id: `overdue-${invoice.id}`,
      meta: `${invoice.client.name} - Due ${formatDate(invoice.dueDate)} - ${formatStatus(invoice.status)}`,
      title: `${invoice.invoiceNumber} is overdue`,
      tone: "red" as const
    })),
    ...data.followUpInvoices.map((invoice) => ({
      amount: invoice.balance,
      href: withBasePath(appBasePath, "/invoices"),
      id: `follow-up-${invoice.id}`,
      meta: `${invoice.client.name} - Sent ${formatDate(invoice.sentAt)}`,
      title: `Follow up ${invoice.invoiceNumber}`,
      tone: "blue" as const
    })),
    ...data.staleQuotes.map((quote) => ({
      amount: quote.total,
      href: withBasePath(appBasePath, "/quotes"),
      id: `stale-quote-${quote.id}`,
      meta: `${quote.client.name} - Issued ${formatDate(quote.issueDate)}`,
      title: `Check quote ${quote.quoteNumber}`,
      tone: "amber" as const
    }))
  ];

  const quickActions = [
    {
      description: "Add a new customer before creating work.",
      href: withBasePath(appBasePath, "/clients"),
      icon: FileText,
      label: "New client"
    },
    {
      description: "Schedule or track work for a client.",
      href: withBasePath(appBasePath, "/jobs"),
      icon: BriefcaseBusiness,
      label: "New job"
    },
    {
      description: "Build a quote with line items.",
      href: withBasePath(appBasePath, "/quotes"),
      icon: Send,
      label: "New quote"
    },
    {
      description: "Create an invoice or record payment.",
      href: withBasePath(appBasePath, "/invoices"),
      icon: ReceiptText,
      label: "Invoices"
    }
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Dashboard
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Today at {organization.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            A live view of money due, invoices needing attention, stale quotes, and scheduled work.
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Active clients
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{data.activeClientCount}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Invoiced this month
            </p>
            <ReceiptText className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-950">
            {formatCurrency(data.invoicedThisMonth)}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Collected this month
            </p>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-950">
            {formatCurrency(data.collectedThisMonth)}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Outstanding balance
            </p>
            <AlertTriangle className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-950">
            {formatCurrency(data.outstandingBalance)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">Today actions</h2>
              <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                {actions.length} open
              </span>
            </div>
            {actions.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {actions.map((action) => (
                  <ActionCard action={action} key={action.id} />
                ))}
              </div>
            ) : (
              <EmptyState title="Nothing needs follow-up today">
                Overdue invoices, sent invoices older than {FOLLOW_UP_DAYS} days, and stale quotes
                will appear here when they need attention.
              </EmptyState>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">Upcoming jobs</h2>
              <Link
                className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-950"
                href={withBasePath(appBasePath, "/jobs")}
              >
                View jobs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {data.upcomingJobs.length > 0 ? (
              <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                <div className="divide-y divide-slate-200">
                  {data.upcomingJobs.map((job) => (
                    <Link
                      className="grid gap-3 p-4 transition hover:bg-slate-50 sm:grid-cols-[1fr_auto]"
                      href={withBasePath(appBasePath, "/jobs")}
                      key={job.id}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-950">{job.title}</p>
                          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
                            {job.status === "IN_PROGRESS" ? "In progress" : "Scheduled"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{job.client.name}</p>
                        {job.location ? (
                          <p className="mt-1 text-xs text-slate-500">{job.location}</p>
                        ) : null}
                      </div>
                      <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <CalendarClock className="h-4 w-4 text-slate-400" />
                        {formatDate(job.scheduledAt)}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState title="No upcoming jobs">
                Scheduled jobs in the next 14 days will show here.
              </EmptyState>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Quick actions</h2>
            <div className="mt-4 grid gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link
                    className="group flex items-start gap-3 rounded-md border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:bg-slate-50"
                    href={action.href}
                    key={action.href}
                  >
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-950">
                        {action.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {action.description}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Recent records</h2>
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-slate-800">Clients</h3>
                  <Link
                    className="text-xs font-semibold text-slate-600 hover:text-slate-950"
                    href={withBasePath(appBasePath, "/clients")}
                  >
                    View
                  </Link>
                </div>
                {data.recentClients.length > 0 ? (
                  <div className="space-y-2">
                    {data.recentClients.map((client) => (
                      <p className="flex justify-between gap-3" key={client.id}>
                        <span className="truncate text-slate-700">{client.name}</span>
                        <span className="shrink-0 text-xs text-slate-500">
                          {formatDate(client.createdAt)}
                        </span>
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">No clients yet.</p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-slate-800">Quotes</h3>
                  <Link
                    className="text-xs font-semibold text-slate-600 hover:text-slate-950"
                    href={withBasePath(appBasePath, "/quotes")}
                  >
                    View
                  </Link>
                </div>
                {data.recentQuotes.length > 0 ? (
                  <div className="space-y-2">
                    {data.recentQuotes.map((quote) => (
                      <p className="text-slate-700" key={quote.id}>
                        <span className="font-medium">{quote.quoteNumber}</span>{" "}
                        <span className="text-slate-500">
                          for {quote.client.name}
                          {quote.jobs[0] ? `, job ${quote.jobs[0].title}` : ""}
                        </span>
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">No quotes yet.</p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-slate-800">Invoices</h3>
                  <Link
                    className="text-xs font-semibold text-slate-600 hover:text-slate-950"
                    href={withBasePath(appBasePath, "/invoices")}
                  >
                    View
                  </Link>
                </div>
                {data.recentInvoices.length > 0 ? (
                  <div className="space-y-2">
                    {data.recentInvoices.map((invoice) => (
                      <p className="text-slate-700" key={invoice.id}>
                        <span className="font-medium">{invoice.invoiceNumber}</span>{" "}
                        <span className="text-slate-500">
                          {formatCurrency(invoice.balance)} balance for {invoice.client.name}
                          {invoice.job ? `, job ${invoice.job.title}` : ""}
                        </span>
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">No invoices yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">What this means</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Overdue invoices</dt>
                <dd className="font-semibold text-slate-950">{data.overdueInvoices.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Needs follow-up</dt>
                <dd className="font-semibold text-slate-950">{data.followUpInvoices.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Stale quotes</dt>
                <dd className="font-semibold text-slate-950">{data.staleQuotes.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Upcoming jobs</dt>
                <dd className="font-semibold text-slate-950">{data.upcomingJobs.length}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
}
