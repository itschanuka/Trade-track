import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, FileText, ReceiptText } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";

const workflow = ["Client", "Quote", "Job", "Invoice", "Reminder", "Payment"];

const stats = [
  { label: "Open jobs", value: "18" },
  { label: "Awaiting payment", value: "$7.4k" },
  { label: "Quotes sent", value: "24" }
];

export default function PublicHomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicHeader />

      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-10 px-6 py-14 lg:grid-cols-[1fr_0.95fr]">
        <div className="space-y-8">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase text-blue-700">For solo tradespeople</p>
            <h1 className="max-w-3xl text-5xl font-bold leading-tight text-slate-950 sm:text-6xl">
              Run jobs, quotes, invoices, and payments without spreadsheet chaos.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              TradeTrack keeps client details, job progress, quotes, invoices, payment tracking,
              PDFs, and overdue follow-up in one organized place.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link className="inline-flex items-center justify-center gap-2 bg-slate-950 px-5 py-3 text-sm font-semibold text-white" href="/signup">
              Create account <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
            <Link className="inline-flex items-center justify-center border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-900" href="/features">
              See features
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-6">
            {workflow.map((step) => (
              <div className="border border-slate-200 px-3 py-2 text-center text-xs font-semibold text-slate-700" key={step}>
                {step}
              </div>
            ))}
          </div>
        </div>

        <div className="border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-sm font-semibold text-slate-900">Today in TradeTrack</p>
              <p className="text-xs text-slate-500">Malik&apos;s Electrical</p>
            </div>
            <div className="grid gap-3 p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div className="border border-slate-200 p-3" key={stat.label}>
                    <p className="text-xs text-slate-500">{stat.label}</p>
                    <p className="mt-1 text-xl font-bold">{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-3">
                <div className="flex items-start gap-3 border border-slate-200 p-4">
                  <BriefcaseBusiness aria-hidden className="mt-1 h-5 w-5 text-blue-700" />
                  <div>
                    <p className="font-semibold">Kitchen rewiring scheduled</p>
                    <p className="text-sm text-slate-500">Materials list, client notes, and quote linked.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 border border-slate-200 p-4">
                  <ReceiptText aria-hidden className="mt-1 h-5 w-5 text-emerald-700" />
                  <div>
                    <p className="font-semibold">Invoice INV-104 needs follow-up</p>
                    <p className="text-sm text-slate-500">Reminder ready, balance visible, payment history attached.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 border border-slate-200 p-4">
                  <FileText aria-hidden className="mt-1 h-5 w-5 text-amber-700" />
                  <div>
                    <p className="font-semibold">Quote ready to convert</p>
                    <p className="text-sm text-slate-500">Accepted work can become a scheduled job without retyping.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-3">
          {[
            ["Quote faster", "Build quotes from client and job details, then convert accepted work into jobs."],
            ["Invoice clearly", "Track sent, partial, paid, and overdue invoices without chasing notes in chats."],
            ["Know what matters", "See outstanding balances, upcoming jobs, and overdue reminders without a spreadsheet."]
          ].map(([title, body]) => (
            <div className="border border-slate-200 bg-white p-6" key={title}>
              <FileText aria-hidden className="mb-5 h-6 w-6 text-blue-700" />
              <h2 className="text-lg font-bold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>TradeTrack helps solo contractors keep work moving.</p>
          <div className="flex gap-5">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
