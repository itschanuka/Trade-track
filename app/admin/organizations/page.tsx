import Link from "next/link";
import { Eye } from "lucide-react";
import { setOrganizationSuspension } from "../actions";
import { formatCurrency, formatDate } from "../admin-format";
import { ConfirmSubmitButton } from "../ConfirmSubmitButton";
import { EmptyState, SectionHeader, StatusBadge } from "../AdminUi";
import { adminPrisma } from "@/lib/db/adminPrisma";

export const dynamic = "force-dynamic";

export default async function AdminOrganizationsPage() {
  const [organizations, invoiceTotals] = await Promise.all([
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
      }
    }),
    adminPrisma.invoice.groupBy({
      by: ["organizationId"],
      _sum: {
        amountPaid: true,
        balance: true,
        total: true
      },
      where: { status: { not: "CANCELLED" } }
    })
  ]);
  const totalsByOrganizationId = new Map(
    invoiceTotals.map((total) => [
      total.organizationId,
      {
        amountPaid: total._sum.amountPaid ?? 0,
        balance: total._sum.balance ?? 0,
        total: total._sum.total ?? 0
      }
    ])
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Admin</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Organizations
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Manage tenant status and inspect usage across the active workflow.
        </p>
      </div>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <SectionHeader title="Organization management">
          Suspend or unsuspend tenants with confirmation. Details stay server-rendered.
        </SectionHeader>
        {organizations.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No organizations found">Seed demo data or onboard a user to populate this table.</EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Organization</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Users</th>
                  <th className="px-4 py-3 font-semibold">Records</th>
                  <th className="px-4 py-3 font-semibold">Invoice totals</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {organizations.map((organization) => {
                  const totals = totalsByOrganizationId.get(organization.id) ?? {
                    amountPaid: 0,
                    balance: 0,
                    total: 0
                  };

                  return (
                    <tr className="align-top" key={organization.id}>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-950">{organization.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{organization.slug}</p>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge suspended={organization.isSuspended} />
                      </td>
                      <td className="px-4 py-4 text-slate-600">{formatDate(organization.createdAt)}</td>
                      <td className="px-4 py-4 text-slate-600">{organization._count.members}</td>
                      <td className="px-4 py-4 text-xs leading-5 text-slate-600">
                        <p>{organization._count.clients} clients</p>
                        <p>{organization._count.jobs} jobs</p>
                        <p>{organization._count.quotes} quotes</p>
                        <p>{organization._count.invoices} invoices</p>
                      </td>
                      <td className="px-4 py-4 text-xs leading-5 text-slate-600">
                        <p>Total {formatCurrency(totals.total)}</p>
                        <p>Paid {formatCurrency(totals.amountPaid)}</p>
                        <p>Outstanding {formatCurrency(totals.balance)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            href={`/admin/organizations/${organization.id}`}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Link>
                          <form action={setOrganizationSuspension}>
                            <input name="organizationId" type="hidden" value={organization.id} />
                            <input
                              name="isSuspended"
                              type="hidden"
                              value={organization.isSuspended ? "false" : "true"}
                            />
                            <ConfirmSubmitButton
                              confirmMessage={`${
                                organization.isSuspended ? "Unsuspend" : "Suspend"
                              } ${organization.name}?`}
                              tone={organization.isSuspended ? "neutral" : "danger"}
                            >
                              {organization.isSuspended ? "Unsuspend" : "Suspend"}
                            </ConfirmSubmitButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
