import { ForbiddenException, Injectable } from '@nestjs/common';
import type {
  OrganizationPermission,
  OrganizationRole,
  ProjectPermission,
  ProjectRole,
} from './permissions.js';
import {
  ORGANIZATION_ROLE_PERMISSIONS,
  PROJECT_ROLE_PERMISSIONS,
} from './role-permissions.js';

@Injectable()
export class PermissionService {
  hasOrganizationPermission(
    role: OrganizationRole,
    permission: OrganizationPermission,
  ): boolean {
    return ORGANIZATION_ROLE_PERMISSIONS[role].has(permission);
  }

  hasProjectPermission(
    role: ProjectRole,
    permission: ProjectPermission,
  ): boolean {
    return PROJECT_ROLE_PERMISSIONS[role].has(permission);
  }

  requireOrganizationPermission(
    role: OrganizationRole,
    permission: OrganizationPermission,
  ): void {
    if (!this.hasOrganizationPermission(role, permission)) {
      throw new ForbiddenException({
        code: 'ORGANIZATION_PERMISSION_DENIED',
        message: 'You do not have permission to perform this organization action.',
      });
    }
  }

  requireProjectPermission(
    role: ProjectRole,
    permission: ProjectPermission,
  ): void {
    if (!this.hasProjectPermission(role, permission)) {
      throw new ForbiddenException({
        code: 'PROJECT_PERMISSION_DENIED',
        message: 'You do not have permission to perform this project action.',
      });
    }
  }

  canAssignOrganizationRole(
    actorRole: OrganizationRole,
    targetRole: OrganizationRole,
  ): boolean {
    if (!this.hasOrganizationPermission(actorRole, 'organization:assign-roles')) {
      return actorRole === 'ADMIN' && targetRole === 'MEMBER';
    }
    return true;
  }

  canRemoveOrganizationRole(
    actorRole: OrganizationRole,
    targetRole: OrganizationRole,
  ): boolean {
    if (!this.hasOrganizationPermission(actorRole, 'organization:remove-members')) {
      return false;
    }
    return actorRole === 'OWNER' || targetRole === 'MEMBER';
  }
}
