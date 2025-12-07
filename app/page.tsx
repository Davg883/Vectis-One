import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="flex max-w-3xl flex-col gap-6 rounded-3xl border border-slate-200 bg-white px-10 py-12 shadow-xl shadow-slate-200/60">
        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
          Vectis One
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Intelligence for the Industrial World.
        </h1>
        <p className="max-w-2xl text-lg text-slate-600">
          Mission-ready control across transport, safety, civic, and on-site operations.
        </p>
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full bg-[var(--color-brand-bg)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:translate-y-[-1px] hover:shadow-xl"
          >
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}
