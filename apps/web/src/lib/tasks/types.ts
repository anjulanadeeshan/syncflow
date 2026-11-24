export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type ProjectRole = 'PROJECT_MANAGER' | 'MEMBER';

export type TaskUser = {
  id: string;
  name: string;
  email: string;
};

export type Subtask = {
  id: string;
  title: string;
  isCompleted: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  organizationId: string;
  projectId: string;
  number: number;
  workflowColumnId: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  archivedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: TaskUser;
  assignees: TaskUser[];
  subtasks: Subtask[];
};

export type ProjectTaskContext = {
  id: string;
  organizationId: string;
  name: string;
  key: string;
  description: string | null;
  archivedAt: string | null;
};

export type AssignableProjectMember = {
  user: TaskUser;
  role: ProjectRole;
};
