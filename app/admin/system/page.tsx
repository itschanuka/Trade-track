import { DEMO_ADMIN_EMAIL } from "@/lib/admin/access";
import { adminPrisma } from "@/lib/db/adminPrisma";

export const dynamic = "force-dynamic";

async function getDatabaseStatus() {
  try {
    await adminPrisma.organization.count();
    return "Connected";
  } catch {
    return "Unavailable";
  }
}

function getAppMode() {
  if (process.env.NODE_ENV === "production") {
    return "Production";
  }

  if (process.env.NODE_ENV === "test") {
    return "Test";
  }

  return "Development";
}

export default async function AdminSystemPage() {
  const databaseStatus = await getDatabaseStatus();
  const showDemoPasswords = process.env.NODE_ENV !== "production";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Admin</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          System status
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Safe operational status without environment variables, secrets, tokens, or auth internals.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">App mode</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{getAppMode()}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Database</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{databaseStatus}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin access</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">Protected</p>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Active route scope</h2>
        <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">User login</p>
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">Admin login</p>
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">Dashboard</p>
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">Clients</p>
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">Jobs</p>
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">Quotes</p>
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">Invoices</p>
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">Settings</p>
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">Admin</p>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Demo accounts</h2>
        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">User</p>
            <p className="mt-2 font-medium text-slate-950">testuser1@gmail.com</p>
            {showDemoPasswords ? <p className="mt-1 text-xs text-slate-500">Password available from seed output.</p> : null}
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin</p>
            <p className="mt-2 font-medium text-slate-950">{DEMO_ADMIN_EMAIL}</p>
            {showDemoPasswords ? <p className="mt-1 text-xs text-slate-500">Password available from seed output.</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
