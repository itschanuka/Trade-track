"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Building2,
  LayoutDashboard,
  ServerCog,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

type AdminNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const navItems: AdminNavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/organizations", label: "Organizations", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/system", label: "System", icon: ServerCog }
];

export function AdminNavigation({ variant }: { variant: "sidebar" | "mobile" }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin navigation"
      className={cn(
        variant === "sidebar" && "flex flex-col gap-1",
        variant === "mobile" && "flex gap-2 overflow-x-auto px-4 py-3"
      )}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));

        return (
          <Link
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900",
              isActive
                ? "bg-slate-950 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
              variant === "mobile" && "min-w-max border border-slate-200 bg-white"
            )}
            href={item.href}
            key={item.href}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <div className="mt-4 hidden rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 lg:block">
        <div className="mb-2 flex items-center gap-2 font-semibold text-slate-800">
          <Activity className="h-3.5 w-3.5" />
          Active scope
        </div>
        Clients, jobs, quotes, invoices, settings, and platform admin only.
      </div>
    </nav>
  );
}
