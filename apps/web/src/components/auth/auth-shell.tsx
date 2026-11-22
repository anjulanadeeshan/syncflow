import Link from 'next/link';
import type { ReactNode } from 'react';

export function AuthShell({
  title,
  description,
  alternateText,
  alternateHref,
  alternateLabel,
  children,
}: {
  title: string;
  description: string;
  alternateText: string;
  alternateHref: string;
  alternateLabel: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100 sm:px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 block text-center text-2xl font-bold tracking-tight text-white">
          Sync<span className="text-blue-400">Flow</span>
        </Link>
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-blue-950/20 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
          <div className="mt-7">{children}</div>
        </section>
        <p className="mt-6 text-center text-sm text-slate-400">
          {alternateText}{' '}
          <Link href={alternateHref} className="font-medium text-blue-400 hover:text-blue-300">
            {alternateLabel}
          </Link>
        </p>
      </div>
    </main>
  );
}
