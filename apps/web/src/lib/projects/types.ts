export type ProjectRole = 'PROJECT_MANAGER' | 'MEMBER';

export type ProjectMember = {
  user: { id: string; name: string; email: string };
  role: ProjectRole;
  joinedAt: string;
};

export type WorkflowColumn = {
  id: string;
  name: string;
  rank: number;
  color: string | null;
  archivedAt: string | null;
};

export type ProjectSummary = {
  id: string;
  organizationId: string;
  name: string;
  key: string;
  description: string | null;
  role: ProjectRole;
  memberCount: number;
  taskCount: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDetails = ProjectSummary & {
  createdBy: { id: string; name: string; email: string };
  memberships: ProjectMember[];
  workflowColumns: WorkflowColumn[];
};
