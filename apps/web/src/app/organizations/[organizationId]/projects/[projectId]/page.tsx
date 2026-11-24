import { Suspense } from 'react';
import { ProjectTasksRoute } from '@/components/tasks/project-tasks-route';

export default function ProjectTasksPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
          Loading project tasks…
        </main>
      }
    >
      <ProjectTasksRoute />
    </Suspense>
  );
}
