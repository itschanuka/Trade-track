import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link className="text-lg font-bold text-slate-950" href="/">
          TradeTrack
        </Link>
        <nav
          aria-label="Public navigation"
          className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex"
        >
          <Link className="hover:text-slate-950" href="/features">
            Features
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <Link className="font-medium text-slate-700 hover:text-slate-950" href="/login">
            Log in
          </Link>
          <Link className="bg-slate-950 px-4 py-2 font-semibold text-white" href="/signup">
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
