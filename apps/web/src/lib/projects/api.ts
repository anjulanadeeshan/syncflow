import { apiRequest } from '@/lib/auth/api';
import type {
  ProjectDetails,
  ProjectMember,
  ProjectRole,
  ProjectSummary,
} from './types';

function projectsPath(organizationId: string): string {
  return `/organizations/${organizationId}/projects`;
}

export function listProjects(organizationId: string, page = 1, limit = 50) {
  return apiRequest<{
    projects: ProjectSummary[];
    total: number;
    page: number;
    limit: number;
  }>(`${projectsPath(organizationId)}?page=${page}&limit=${limit}`);
}

export function createProject(
  organizationId: string,
  input: { name: string; key: string; description?: string },
) {
  return apiRequest<{ project: ProjectDetails }>(
    projectsPath(organizationId),
    { method: 'POST', body: JSON.stringify(input) },
    true,
  );
}

export function getProject(organizationId: string, projectId: string) {
  return apiRequest<{ project: ProjectDetails }>(
    `${projectsPath(organizationId)}/${projectId}`,
  );
}

export function updateProject(
  organizationId: string,
  projectId: string,
  input: { name?: string; key?: string; description?: string | null },
) {
  return apiRequest<{ project: ProjectDetails }>(
    `${projectsPath(organizationId)}/${projectId}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    true,
  );
}

export function archiveProject(organizationId: string, projectId: string) {
  return apiRequest<void>(
    `${projectsPath(organizationId)}/${projectId}`,
    { method: 'DELETE' },
    true,
  );
}

export function listProjectMembers(organizationId: string, projectId: string) {
  return apiRequest<{ members: ProjectMember[] }>(
    `${projectsPath(organizationId)}/${projectId}/members`,
  );
}

export function addProjectMember(
  organizationId: string,
  projectId: string,
  input: { userId: string; role: ProjectRole },
) {
  return apiRequest(
    `${projectsPath(organizationId)}/${projectId}/members`,
    { method: 'POST', body: JSON.stringify(input) },
    true,
  );
}

export function updateProjectMemberRole(
  organizationId: string,
  projectId: string,
  userId: string,
  role: ProjectRole,
) {
  return apiRequest(
    `${projectsPath(organizationId)}/${projectId}/members/${userId}`,
    { method: 'PATCH', body: JSON.stringify({ role }) },
    true,
  );
}

export function removeProjectMember(
  organizationId: string,
  projectId: string,
  userId: string,
) {
  return apiRequest<void>(
    `${projectsPath(organizationId)}/${projectId}/members/${userId}`,
    { method: 'DELETE' },
    true,
  );
}
