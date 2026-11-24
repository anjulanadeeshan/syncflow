import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import type { ProjectPermission } from './permissions.js';
import { ProjectAccessService } from './project-access.service.js';
import { PROJECT_PERMISSION_METADATA } from './require-project-permission.decorator.js';

@Injectable()
export class ProjectPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: ProjectAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<ProjectPermission>(
      PROJECT_PERMISSION_METADATA,
      [context.getHandler(), context.getClass()],
    );
    if (!permission) return true;

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest & { params: Record<string, string> }>();
    const { organizationId, projectId } = request.params;
    if (!organizationId || !projectId) return false;

    await this.access.requireMembership(
      request.auth.user.id,
      organizationId,
      projectId,
      permission,
    );
    return true;
  }
}
