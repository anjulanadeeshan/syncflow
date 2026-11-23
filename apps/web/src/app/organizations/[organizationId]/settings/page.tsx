'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { OrganizationSettings } from '@/components/organizations/organization-settings';

function OrganizationSettingsRouteContent() {
  const { organizationId } = useParams<{ organizationId: string }>();
  return <OrganizationSettings organizationId={organizationId} />;
}

export default function OrganizationSettingsPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">Loading settings…</main>}>
      <OrganizationSettingsRouteContent />
    </Suspense>
  );
}
