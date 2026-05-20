"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { OrgMemberRole } from "@prisma/client";
import {
  BriefcaseBusiness,
  Building2,
  FileText,
  LayoutDashboard,
  ReceiptText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TenantNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  allowedRoles?: OrgMemberRole[];
};

const navItems: TenantNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/invoices", label: "Invoices", icon: ReceiptText },
  { href: "/settings", label: "Settings", icon: Settings }
];

type TenantNavigationProps = {
  appBasePath: string;
  role: OrgMemberRole;
  variant: "sidebar" | "mobile";
};

function withBasePath(appBasePath: string, href: string) {
  return `${appBasePath}${href}`;
}

function normalizePath(pathname: string, appBasePath: string) {
  if (appBasePath && pathname.startsWith(appBasePath)) {
    return pathname.slice(appBasePath.length) || "/dashboard";
  }

  return pathname;
}

export function TenantNavigation({ appBasePath, role, variant }: TenantNavigationProps) {
  const pathname = usePathname();
  const currentPath = normalizePath(pathname, appBasePath);
  const visibleItems = navItems.filter(
    (item) => !item.allowedRoles || item.allowedRoles.includes(role)
  );

  return (
    <nav
      aria-label="Tenant navigation"
      className={cn(
        variant === "sidebar" && "flex flex-col gap-1",
        variant === "mobile" && "flex gap-2 overflow-x-auto px-4 py-3"
      )}
    >
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          currentPath === item.href || (item.href !== "/dashboard" && currentPath.startsWith(item.href));

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
            href={withBasePath(appBasePath, item.href)}
            key={item.href}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
