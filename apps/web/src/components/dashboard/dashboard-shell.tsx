'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useOrganizations } from '@/lib/organizations/organization-context';

export function DashboardShell({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const {
    organizations,
    selectedOrganization,
    isLoading: organizationsLoading,
    selectOrganization,
  } = useOrganizations();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, router, user]);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    router.replace('/login');
  }

  if (authLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <div role="status" className="flex items-center gap-3 text-sm">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-blue-400" />
          Loading your workspace…
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="mr-2 text-xl font-bold">
            Sync<span className="text-blue-400">Flow</span>
          </Link>
          <select
            aria-label="Select organization"
            value={selectedOrganization?.id ?? ''}
            disabled={organizationsLoading || organizations.length === 0}
            onChange={(event) => {
              const organizationId = event.target.value;
              selectOrganization(organizationId);
              router.push(`/organizations/${organizationId}`);
            }}
            className="min-w-48 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:opacity-60"
          >
            {organizations.length === 0 ? <option value="">No organizations</option> : null}
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>{organization.name}</option>
            ))}
          </select>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/organizations" className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white">Organizations</Link>
            {selectedOrganization ? (
              <>
                <Link href={`/organizations/${selectedOrganization.id}`} className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white">Projects</Link>
                <Link href={`/organizations/${selectedOrganization.id}/settings`} className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white">Settings</Link>
              </>
            ) : null}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-slate-400 sm:inline">{user.name}</span>
            <button type="button" onClick={handleLogout} disabled={loggingOut} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-60">{loggingOut ? 'Signing out…' : 'Sign out'}</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
            {description ? <p className="mt-2 max-w-2xl text-slate-400">{description}</p> : null}
          </div>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}
