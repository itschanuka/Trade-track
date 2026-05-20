import { formatDate } from "../admin-format";
import { EmptyState, SectionHeader, StatusBadge } from "../AdminUi";
import { adminPrisma } from "@/lib/db/adminPrisma";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await adminPrisma.user.findMany({
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
              id: true,
              isSuspended: true,
              name: true,
              slug: true
            }
          },
          role: true
        }
      }
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Admin</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Users
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Account visibility without password hashes, tokens, sessions, provider data, or secrets.
        </p>
      </div>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <SectionHeader title="User accounts">Only safe identity and organization membership fields are selected.</SectionHeader>
        {users.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No users found">Seed demo data or invite users to populate this table.</EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Verified</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Linked organization</th>
                  <th className="px-4 py-3 font-semibold">Organization status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((user) => {
                  const membership = user.memberships[0];
                  const organization = membership?.organization;

                  return (
                    <tr key={user.id}>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-950">{user.email}</p>
                        <p className="mt-1 text-xs text-slate-500">{user.name || "No name"}</p>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {user.emailVerified ? "Verified" : "Not verified"}
                      </td>
                      <td className="px-4 py-4 text-slate-600">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-4 text-slate-600">
                        {organization ? (
                          <>
                            <p className="font-medium text-slate-950">{organization.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{organization.slug}</p>
                          </>
                        ) : (
                          "No organization"
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {organization ? (
                          <StatusBadge suspended={organization.isSuspended} />
                        ) : (
                          <span className="text-slate-500">None</span>
                        )}
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
