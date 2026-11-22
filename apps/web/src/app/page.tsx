import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-50">
      <section className="max-w-2xl text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-blue-400">
          Project and workflow management
        </p>
        <h1 className="text-6xl font-bold tracking-tight sm:text-7xl">
          SyncFlow
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          A focused workspace for teams to plan projects, manage tasks, and
          move work forward together.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/register" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500">Create account</Link>
          <Link href="/login" className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-900">Sign in</Link>
        </div>
      </section>
    </main>
  );
}
