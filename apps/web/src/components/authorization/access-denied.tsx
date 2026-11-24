import Link from 'next/link';

export function AccessDenied({
  title = 'Access denied',
  message = 'You do not have permission to view or change this resource.',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <section
      role="alert"
      className="rounded-2xl border border-amber-800/70 bg-amber-950/30 p-8"
    >
      <p className="text-sm font-semibold uppercase tracking-wider text-amber-400">
        Permission required
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-3 max-w-xl text-slate-300">{message}</p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-slate-800"
      >
        Return to dashboard
      </Link>
    </section>
  );
}
