import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AdminNavigation } from "./AdminNavigation";
import { isAdminEmail } from "@/lib/admin/access";
import { authOptions } from "@/lib/auth/authOptions";

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getServerSession(authOptions);

  if (!isAdminEmail(session?.user?.email)) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white px-4 py-5 lg:block">
        <div className="mb-8 flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              TradeTrack
            </p>
            <h1 className="mt-1 truncate text-lg font-semibold">Admin console</h1>
            <p className="mt-1 truncate text-xs text-slate-500">{session?.user?.email}</p>
          </div>
        </div>
        <AdminNavigation variant="sidebar" />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 lg:hidden">
                TradeTrack
              </p>
              <h2 className="truncate text-base font-semibold sm:text-lg">Admin console</h2>
            </div>
            <span className="hidden rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 sm:inline-flex">
              Platform owner view
            </span>
          </div>
          <div className="border-t border-slate-200 lg:hidden">
            <AdminNavigation variant="mobile" />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
