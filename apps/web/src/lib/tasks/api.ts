import { apiRequest } from '@/lib/auth/api';
import type {
  AssignableProjectMember,
  ProjectTaskContext,
  Task,
  TaskPriority,
  TaskStatus,
} from './types';

function projectPath(organizationId: string, projectId: string): string {
  return `/organizations/${organizationId}/projects/${projectId}`;
}

export function listTasks(
  organizationId: string,
  projectId: string,
  page = 1,
  limit = 25,
): Promise<{
  project: ProjectTaskContext;
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
}> {
  return apiRequest(
    `${projectPath(organizationId, projectId)}/tasks?page=${page}&limit=${limit}`,
  );
}

export function listAssignableMembers(
  organizationId: string,
  projectId: string,
): Promise<{ members: AssignableProjectMember[] }> {
  return apiRequest(
    `${projectPath(organizationId, projectId)}/task-members`,
  );
}

export function createTask(
  organizationId: string,
  projectId: string,
  input: {
    title: string;
    description?: string;
    priority: TaskPriority;
    dueDate: string | null;
    assigneeIds: string[];
  },
): Promise<{ task: Task }> {
  return apiRequest(
    `${projectPath(organizationId, projectId)}/tasks`,
    { method: 'POST', body: JSON.stringify(input) },
    true,
  );
}

export function updateTask(
  organizationId: string,
  projectId: string,
  taskId: string,
  input: {
    version: number;
    title?: string;
    description?: string | null;
    priority?: TaskPriority;
    status?: TaskStatus;
    dueDate?: string | null;
    assigneeIds?: string[];
  },
): Promise<{ task: Task }> {
  return apiRequest(
    `${projectPath(organizationId, projectId)}/tasks/${taskId}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    true,
  );
}

export function archiveTask(
  organizationId: string,
  projectId: string,
  taskId: string,
  version: number,
): Promise<void> {
  return apiRequest(
    `${projectPath(organizationId, projectId)}/tasks/${taskId}?version=${version}`,
    { method: 'DELETE' },
    true,
  );
}

export function createSubtask(
  organizationId: string,
  projectId: string,
  taskId: string,
  input: { title: string; taskVersion: number },
): Promise<{ task: Task }> {
  return apiRequest(
    `${projectPath(organizationId, projectId)}/tasks/${taskId}/subtasks`,
    { method: 'POST', body: JSON.stringify(input) },
    true,
  );
}

export function updateSubtask(
  organizationId: string,
  projectId: string,
  taskId: string,
  subtaskId: string,
  input: {
    taskVersion: number;
    title?: string;
    isCompleted?: boolean;
  },
): Promise<{ task: Task }> {
  return apiRequest(
    `${projectPath(organizationId, projectId)}/tasks/${taskId}/subtasks/${subtaskId}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    true,
  );
}

export function deleteSubtask(
  organizationId: string,
  projectId: string,
  taskId: string,
  subtaskId: string,
  version: number,
): Promise<{ task: Task }> {
  return apiRequest(
    `${projectPath(organizationId, projectId)}/tasks/${taskId}/subtasks/${subtaskId}?version=${version}`,
    { method: 'DELETE' },
    true,
  );
}
