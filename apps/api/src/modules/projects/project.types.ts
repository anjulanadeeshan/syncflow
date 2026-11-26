export const PROJECT_ROLES = ['PROJECT_MANAGER', 'MEMBER'] as const;
export type ProjectRoleValue = (typeof PROJECT_ROLES)[number];

export const DEFAULT_WORKFLOW_COLUMNS = [
  { name: 'To do', rank: 1_000, color: '#64748b' },
  { name: 'In progress', rank: 2_000, color: '#3b82f6' },
  { name: 'Done', rank: 3_000, color: '#22c55e' },
] as const;
