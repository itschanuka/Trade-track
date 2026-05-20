"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ reset }: DashboardErrorProps) {
  return (
    <section className="rounded-md border border-red-200 bg-red-50 p-6 text-red-800">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <h2 className="text-base font-semibold">Could not load dashboard</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6">
            The organization dashboard data could not be loaded. Try again, and if it keeps
            failing, check the server logs for the dashboard query.
          </p>
          <button
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
            onClick={reset}
            type="button"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    </section>
  );
}
