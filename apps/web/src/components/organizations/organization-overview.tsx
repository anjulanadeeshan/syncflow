'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { ApiError } from '@/lib/auth/api';
import { getOrganization } from '@/lib/organizations/api';
import { useOrganizations } from '@/lib/organizations/organization-context';
import type { OrganizationDetails } from '@/lib/organizations/types';

export function OrganizationOverview({ organizationId }: { organizationId: string }) {
  const { selectOrganization } = useOrganizations();
  const [organization, setOrganization] = useState<OrganizationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    selectOrganization(organizationId);
    getOrganization(organizationId)
      .then((response) => {
        if (active) setOrganization(response.organization);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof ApiError ? caught.message : 'Unable to load this organization.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [organizationId, selectOrganization]);

  return (
    <DashboardShell title={organization?.name ?? 'Organization'} description={organization ? `Workspace /${organization.slug}` : 'Loading workspace details…'} actions={organization ? <Link href={`/organizations/${organization.id}/settings`} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500">Manage organization</Link> : null}>
      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">Loading organization…</div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-red-900/60 bg-red-950/40 p-6 text-red-300">{error}</div>
      ) : organization ? (
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"><p className="text-sm text-slate-500">Your role</p><p className="mt-2 text-xl font-semibold">{organization.role}</p></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"><p className="text-sm text-slate-500">Members</p><p className="mt-2 text-xl font-semibold">{organization.memberCount}</p></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"><p className="text-sm text-slate-500">Invitations</p><p className="mt-2 text-xl font-semibold">{organization.invitationCount}</p></div>
        </div>
      ) : null}
    </DashboardShell>
  );
}
