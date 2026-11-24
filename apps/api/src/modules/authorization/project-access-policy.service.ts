import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  OrganizationRole,
  ProjectPermission,
  ProjectRole,
} from './permissions.js';
import { PermissionService } from './permission.service.js';

export type ProjectAccessContext = {
  organizationRole: OrganizationRole | null;
  projectRole: ProjectRole | null;
};

@Injectable()
export class ProjectAccessPolicyService {
  constructor(private readonly permissions: PermissionService) {}

  can(
    context: ProjectAccessContext,
    permission: ProjectPermission,
  ): boolean {
    return Boolean(
      context.organizationRole &&
        context.projectRole &&
        this.permissions.hasProjectPermission(context.projectRole, permission),
    );
  }

  require(
    context: ProjectAccessContext,
    permission: ProjectPermission,
  ): void {
    if (!context.organizationRole || !context.projectRole) {
      throw new NotFoundException({
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found.',
      });
    }
    this.permissions.requireProjectPermission(context.projectRole, permission);
  }
}
