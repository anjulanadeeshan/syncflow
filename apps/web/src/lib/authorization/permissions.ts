import type { OrganizationRole } from '@/lib/organizations/types';

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

const ROLE_PERMISSIONS: Readonly<
  Record<OrganizationRole, ReadonlySet<OrganizationPermission>>
> = {
  OWNER: new Set(Object.values(ORGANIZATION_PERMISSIONS)),
  ADMIN: new Set([
    ORGANIZATION_PERMISSIONS.READ,
    ORGANIZATION_PERMISSIONS.READ_MEMBERS,
    ORGANIZATION_PERMISSIONS.INVITE_MEMBERS,
    ORGANIZATION_PERMISSIONS.READ_INVITATIONS,
    ORGANIZATION_PERMISSIONS.CANCEL_INVITATIONS,
    ORGANIZATION_PERMISSIONS.REMOVE_MEMBERS,
    ORGANIZATION_PERMISSIONS.CREATE_PROJECTS,
  ]),
  MEMBER: new Set([
    ORGANIZATION_PERMISSIONS.READ,
    ORGANIZATION_PERMISSIONS.READ_MEMBERS,
  ]),
};

export function hasOrganizationPermission(
  role: OrganizationRole | null | undefined,
  permission: OrganizationPermission,
): boolean {
  return role ? ROLE_PERMISSIONS[role].has(permission) : false;
}

export function canAssignOrganizationRole(
  actorRole: OrganizationRole,
  targetRole: OrganizationRole,
): boolean {
  return (
    hasOrganizationPermission(
      actorRole,
      ORGANIZATION_PERMISSIONS.ASSIGN_ROLES,
    ) ||
    (actorRole === 'ADMIN' && targetRole === 'MEMBER')
  );
}

export function canRemoveOrganizationRole(
  actorRole: OrganizationRole,
  targetRole: OrganizationRole,
): boolean {
  return (
    hasOrganizationPermission(
      actorRole,
      ORGANIZATION_PERMISSIONS.REMOVE_MEMBERS,
    ) &&
    (actorRole === 'OWNER' || targetRole === 'MEMBER')
  );
}
