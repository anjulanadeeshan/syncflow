'use client';

import Link from 'next/link';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { useAuth } from '@/lib/auth/auth-context';
import { useOrganizations } from '@/lib/organizations/organization-context';

export default function DashboardPage() {
  const { user } = useAuth();
  const { organizations, selectedOrganization, isLoading, error } = useOrganizations();

  return (
    <DashboardShell title={`Welcome${user ? `, ${user.name}` : ''}`} description="Choose a workspace and keep your team moving in the same direction.">
      {isLoading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">Loading organizations…</div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-red-900/60 bg-red-950/40 p-6 text-red-300">{error}</div>
      ) : organizations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-10 text-center">
          <h2 className="text-xl font-semibold text-white">Create your first organization</h2>
          <p className="mt-2 text-slate-400">Organizations isolate members, invitations, projects, and work.</p>
          <Link href="/organizations" className="mt-6 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500">Get started</Link>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">Current workspace</p>
            <h2 className="mt-3 text-2xl font-semibold">{selectedOrganization?.name}</h2>
            <p className="mt-2 text-sm text-slate-400">{selectedOrganization?.memberCount} members · {selectedOrganization?.role}</p>
            {selectedOrganization ? <Link href={`/organizations/${selectedOrganization.id}`} className="mt-5 inline-flex text-sm font-semibold text-blue-400 hover:text-blue-300">Open organization →</Link> : null}
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Next module</p>
            <h2 className="mt-3 text-xl font-semibold">Projects are not enabled yet</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Organization membership is ready. Project management remains intentionally deferred.</p>
          </section>
        </div>
      )}
    </DashboardShell>
  );
}
