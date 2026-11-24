import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { OrganizationAccessService } from './organization-access.service.js';
import type { OrganizationPermission } from './permissions.js';
import { ORGANIZATION_PERMISSION_METADATA } from './require-organization-permission.decorator.js';

@Injectable()
export class OrganizationPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: OrganizationAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<OrganizationPermission>(
      ORGANIZATION_PERMISSION_METADATA,
      [context.getHandler(), context.getClass()],
    );
    if (!permission) return true;

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest & { params: Record<string, string> }>();
    const organizationId = request.params.organizationId;
    if (!organizationId) return false;

    await this.access.requireMembership(
      request.auth.user.id,
      organizationId,
      permission,
    );
    return true;
  }
}
