export const ORGANIZATION_PERMISSIONS = {
  READ: 'organization:read',
  UPDATE_SETTINGS: 'organization:update-settings',
  READ_MEMBERS: 'organization:read-members',
  INVITE_MEMBERS: 'organization:invite-members',
  READ_INVITATIONS: 'organization:read-invitations',
  CANCEL_INVITATIONS: 'organization:cancel-invitations',
  REMOVE_MEMBERS: 'organization:remove-members',
  ASSIGN_ROLES: 'organization:assign-roles',
  CREATE_PROJECTS: 'organization:create-projects',
} as const;

export type OrganizationPermission =
  (typeof ORGANIZATION_PERMISSIONS)[keyof typeof ORGANIZATION_PERMISSIONS];

export const PROJECT_PERMISSIONS = {
  READ: 'project:read',
  UPDATE: 'project:update',
  ARCHIVE: 'project:archive',
  MANAGE_MEMBERS: 'project:manage-members',
  MANAGE_WORKFLOW: 'project:manage-workflow',
  MANAGE_TASKS: 'project:manage-tasks',
  COMMENT: 'project:comment',
  MODERATE_COMMENTS: 'project:moderate-comments',
} as const;

export type ProjectPermission =
  (typeof PROJECT_PERMISSIONS)[keyof typeof PROJECT_PERMISSIONS];

export const ORGANIZATION_ROLES = ['OWNER', 'ADMIN', 'MEMBER'] as const;
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const PROJECT_ROLES = ['PROJECT_MANAGER', 'MEMBER'] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];
