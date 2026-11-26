'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { ProjectSettings } from '@/components/projects/project-settings';

function ProjectSettingsRoute() {
  const params = useParams<{ organizationId: string; projectId: string }>();
  return (
    <ProjectSettings
      organizationId={params.organizationId}
      projectId={params.projectId}
    />
  );
}

export default function ProjectSettingsPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Loading project settings…</main>}>
      <ProjectSettingsRoute />
    </Suspense>
  );
}
