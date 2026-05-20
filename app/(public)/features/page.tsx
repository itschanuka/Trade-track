import { Bell, BriefcaseBusiness, CreditCard, FileText, ReceiptText, Users } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";

const features = [
  ["Clients", "Keep phone numbers, notes, addresses, jobs, quotes, and invoices together.", Users],
  ["Jobs", "Track scheduled, in-progress, completed, invoiced, and cancelled work without hunting through chats.", BriefcaseBusiness],
  ["Quotes", "Build clear quotes, send them, and convert accepted work into jobs.", FileText],
  ["Invoices", "Create invoices, generate PDFs, and see what is overdue at a glance.", ReceiptText],
  ["Payments", "Record payments against invoices and keep balances accurate.", CreditCard],
  ["Reminders", "Prepare overdue invoice reminders with organization-scoped data.", Bell]
] as const;

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicHeader />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase text-blue-700">Features</p>
            <h1 className="text-4xl font-bold">Everything a solo tradesperson needs to keep work moving.</h1>
            <p className="text-lg leading-8 text-slate-600">
              TradeTrack follows the real workflow: client to quote to job to invoice to reminder to payment.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map(([title, body, Icon]) => (
              <article className="border border-slate-200 p-5" key={title}>
                <Icon aria-hidden className="mb-4 h-6 w-6 text-blue-700" />
                <h2 className="font-bold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
