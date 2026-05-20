import { PublicHeader } from "@/components/layout/PublicHeader";
import { ResetPasswordForm } from "./ResetPasswordForm";

type ResetPasswordPageProps = {
  searchParams?: {
    token?: string;
  };
};

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicHeader />
      <section className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-8 space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">TradeTrack</p>
          <h1 className="text-3xl font-bold text-slate-950">Choose a new password</h1>
          <p className="text-sm text-slate-600">Password reset links expire after 1 hour.</p>
        </div>
        <ResetPasswordForm token={searchParams?.token} />
      </section>
    </main>
  );
}
