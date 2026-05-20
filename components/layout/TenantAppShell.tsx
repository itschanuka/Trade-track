import type { OrgMemberRole } from "@prisma/client";
import { TenantNavigation } from "./TenantNavigation";

type TenantAppShellProps = {
  appBasePath: string;
  children: React.ReactNode;
  organization: {
    name: string;
    slug: string;
  };
  role: OrgMemberRole;
};

export function TenantAppShell({ appBasePath, children, organization, role }: TenantAppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white px-4 py-5 lg:block">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">TradeTrack</p>
          <h1 className="mt-1 truncate text-lg font-semibold">{organization.name}</h1>
          <p className="mt-1 truncate text-xs text-slate-500">{organization.slug}.tradetrack.app</p>
        </div>
        <TenantNavigation appBasePath={appBasePath} role={role} variant="sidebar" />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 lg:hidden">
                TradeTrack
              </p>
              <h2 className="truncate text-base font-semibold sm:text-lg">{organization.name}</h2>
            </div>
          </div>
          <div className="border-t border-slate-200 lg:hidden">
            <TenantNavigation appBasePath={appBasePath} role={role} variant="mobile" />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
