'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { OrganizationOverview } from '@/components/organizations/organization-overview';

function OrganizationRouteContent() {
  const { organizationId } = useParams<{ organizationId: string }>();
  return <OrganizationOverview organizationId={organizationId} />;
}

export default function OrganizationPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">Loading organization…</main>}>
      <OrganizationRouteContent />
    </Suspense>
  );
}
