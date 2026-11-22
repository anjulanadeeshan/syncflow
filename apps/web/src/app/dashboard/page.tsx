'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [isLoading, router, user]);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    router.replace('/login');
  }

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <div role="status" className="flex items-center gap-3 text-sm">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-blue-400" />
          Loading your session…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <span className="text-xl font-bold">Sync<span className="text-blue-400">Flow</span></span>
          <button onClick={handleLogout} disabled={loggingOut} className="rounded-lg border border-slate-700 px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:opacity-60">
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm font-medium text-blue-400">Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Welcome, {user.name}</h1>
        <p className="mt-3 max-w-2xl text-slate-400">Your authenticated account is ready. Organizations, projects, and boards will be added in the next phases.</p>
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Signed in as</p>
          <p className="mt-2 font-medium text-slate-100">{user.email}</p>
        </div>
      </section>
    </main>
  );
}
