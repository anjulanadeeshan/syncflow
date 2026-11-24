export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type TaskPriorityValue = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
export type TaskStatusValue = (typeof TASK_STATUSES)[number];
