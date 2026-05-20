import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: number | string;
  helper?: string;
};

type StatusBadgeProps = {
  suspended: boolean;
};

type EmptyStateProps = {
  children: React.ReactNode;
  title: string;
};

export function MetricCard({ helper, label, value }: MetricCardProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

export function StatusBadge({ suspended }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-1 text-xs font-medium",
        suspended
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      )}
    >
      {suspended ? "Suspended" : "Active"}
    </span>
  );
}

export function EmptyState({ children, title }: EmptyStateProps) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{children}</p>
    </div>
  );
}

export function SectionHeader({
  actionHref,
  actionLabel,
  children,
  title
}: {
  actionHref?: string;
  actionLabel?: string;
  children?: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {children ? <p className="mt-1 text-sm text-slate-500">{children}</p> : null}
      </div>
      {actionHref && actionLabel ? (
        <Link
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-950"
          href={actionHref}
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}
