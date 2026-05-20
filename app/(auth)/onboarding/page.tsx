import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/authOptions";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
      <div className="mb-8 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">TradeTrack</p>
        <h1 className="text-3xl font-bold text-slate-950">Set up your organization</h1>
        <p className="text-sm text-slate-600">
          Add your business profile and default invoice settings. You can refine these later.
        </p>
      </div>
      <OnboardingForm />
    </main>
  );
}
