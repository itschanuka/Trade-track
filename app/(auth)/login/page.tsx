import Link from "next/link";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { LoginForm } from "./LoginForm";

type LoginPageProps = {
  searchParams?: {
    verified?: string;
  };
};

function getNotice(verified?: string) {
  if (verified === "1") {
    return "Your email is verified. You can log in now.";
  }

  if (verified === "expired" || verified === "invalid") {
    return "That verification link is invalid or expired.";
  }

  return undefined;
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicHeader />
      <section className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-8 space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">TradeTrack</p>
          <h1 className="text-3xl font-bold text-slate-950">Log in</h1>
          <p className="text-sm text-slate-600">Use your verified email and password.</p>
        </div>
        <LoginForm notice={getNotice(searchParams?.verified)} />
        <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
          <Link className="font-semibold text-slate-950" href="/signup">
            Create account
          </Link>
          <Link className="font-semibold text-slate-950" href="/forgot-password">
            Forgot password?
          </Link>
        </div>
      </section>
    </main>
  );
}
