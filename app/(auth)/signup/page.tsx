import Link from "next/link";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicHeader />
      <section className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-8 space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">TradeTrack</p>
          <h1 className="text-3xl font-bold text-slate-950">Create your account</h1>
          <p className="text-sm text-slate-600">
            Verify your email before setting up your organization.
          </p>
        </div>
        <SignupForm />
        <p className="mt-6 text-sm text-slate-600">
          Already have an account?{" "}
          <Link className="font-semibold text-slate-950" href="/login">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
