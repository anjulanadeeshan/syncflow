'use client';

import { useParams } from 'next/navigation';
import { ProjectTasks } from './project-tasks';

export function ProjectTasksRoute() {
  const params = useParams<{
    organizationId: string;
    projectId: string;
  }>();

  return (
    <ProjectTasks
      organizationId={params.organizationId}
      projectId={params.projectId}
    />
  );
}
