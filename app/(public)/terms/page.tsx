import { PublicHeader } from "@/components/layout/PublicHeader";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicHeader />
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-bold">Terms of service</h1>
        <p className="mt-4 leading-7 text-slate-600">
          This placeholder will be replaced before launch with the full terms for TradeTrack.
        </p>
      </section>
    </main>
  );
}
