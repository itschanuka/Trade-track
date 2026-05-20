import Link from "next/link";
import { getOrgAppUrl, normalizeOrgSlug } from "@/lib/auth/organization-onboarding";

type OnboardingCompletePageProps = {
  searchParams?: {
    slug?: string;
  };
};

export default function OnboardingCompletePage({ searchParams }: OnboardingCompletePageProps) {
  const slug = normalizeOrgSlug(searchParams?.slug ?? "");
  const dashboardUrl = slug ? `${getOrgAppUrl(slug)}/dashboard` : "/onboarding";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">TradeTrack</p>
        <h1 className="text-3xl font-bold text-slate-950">Organization created</h1>
        <p className="text-sm text-slate-600">
          Your tenant workspace is ready. Tenant routing lands in the next phase, so this link may
          resolve fully once routing middleware is enabled.
        </p>
        <Link
          className="block bg-slate-950 px-4 py-2 text-center text-sm font-semibold text-white"
          href={dashboardUrl}
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
