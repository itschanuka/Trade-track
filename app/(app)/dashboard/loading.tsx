import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <section className="space-y-6">
      <div className="flex min-h-48 items-center justify-center rounded-md border border-slate-200 bg-white text-sm text-slate-600 shadow-sm">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading dashboard
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div className="h-28 rounded-md border border-slate-200 bg-white shadow-sm" key={item} />
        ))}
      </div>
    </section>
  );
}
