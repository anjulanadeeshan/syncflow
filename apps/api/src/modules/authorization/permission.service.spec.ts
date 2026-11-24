import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  ORGANIZATION_PERMISSIONS,
  PROJECT_PERMISSIONS,
} from './permissions.js';
import { PermissionService } from './permission.service.js';
import { ProjectAccessPolicyService } from './project-access-policy.service.js';

describe('PermissionService', () => {
  const permissions = new PermissionService();

  it('enforces least-privilege organization role mappings', () => {
    expect(
      permissions.hasOrganizationPermission(
        'OWNER',
        ORGANIZATION_PERMISSIONS.UPDATE_SETTINGS,
      ),
    ).toBe(true);
    expect(
      permissions.hasOrganizationPermission(
        'ADMIN',
        ORGANIZATION_PERMISSIONS.UPDATE_SETTINGS,
      ),
    ).toBe(false);
    expect(
      permissions.hasOrganizationPermission(
        'ADMIN',
        ORGANIZATION_PERMISSIONS.INVITE_MEMBERS,
      ),
    ).toBe(true);
    expect(
      permissions.hasOrganizationPermission(
        'MEMBER',
        ORGANIZATION_PERMISSIONS.INVITE_MEMBERS,
      ),
    ).toBe(false);
    expect(permissions.canAssignOrganizationRole('ADMIN', 'MEMBER')).toBe(
      true,
    );
    expect(permissions.canAssignOrganizationRole('ADMIN', 'ADMIN')).toBe(
      false,
    );
    expect(permissions.canRemoveOrganizationRole('ADMIN', 'OWNER')).toBe(
      false,
    );
  });

  it('defines reusable project membership permissions', () => {
    expect(
      permissions.hasProjectPermission(
        'PROJECT_MANAGER',
        PROJECT_PERMISSIONS.MANAGE_MEMBERS,
      ),
    ).toBe(true);
    expect(
      permissions.hasProjectPermission(
        'MEMBER',
        PROJECT_PERMISSIONS.MANAGE_MEMBERS,
      ),
    ).toBe(false);
    expect(
      permissions.hasProjectPermission(
        'MEMBER',
        PROJECT_PERMISSIONS.COMMENT,
      ),
    ).toBe(true);
  });

  it('requires both organization and project membership', () => {
    const policy = new ProjectAccessPolicyService(permissions);

    expect(() =>
      policy.require(
        { organizationRole: null, projectRole: 'PROJECT_MANAGER' },
        PROJECT_PERMISSIONS.READ,
      ),
    ).toThrow(NotFoundException);
    expect(() =>
      policy.require(
        { organizationRole: 'OWNER', projectRole: null },
        PROJECT_PERMISSIONS.READ,
      ),
    ).toThrow(NotFoundException);
    expect(() =>
      policy.require(
        { organizationRole: 'MEMBER', projectRole: 'MEMBER' },
        PROJECT_PERMISSIONS.MANAGE_MEMBERS,
      ),
    ).toThrow(ForbiddenException);
    expect(
      policy.can(
        { organizationRole: 'MEMBER', projectRole: 'PROJECT_MANAGER' },
        PROJECT_PERMISSIONS.MANAGE_MEMBERS,
      ),
    ).toBe(true);
  });
});
