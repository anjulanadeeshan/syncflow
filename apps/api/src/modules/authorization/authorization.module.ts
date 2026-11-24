import { Module } from '@nestjs/common';
import { OrganizationAccessService } from './organization-access.service.js';
import { OrganizationPermissionGuard } from './organization-permission.guard.js';
import { PermissionService } from './permission.service.js';
import { ProjectAccessPolicyService } from './project-access-policy.service.js';
import { ProjectAccessService } from './project-access.service.js';
import { ProjectPermissionGuard } from './project-permission.guard.js';

@Module({
  providers: [
    PermissionService,
    OrganizationAccessService,
    OrganizationPermissionGuard,
    ProjectAccessPolicyService,
    ProjectAccessService,
    ProjectPermissionGuard,
  ],
  exports: [
    PermissionService,
    OrganizationAccessService,
    OrganizationPermissionGuard,
    ProjectAccessPolicyService,
    ProjectAccessService,
    ProjectPermissionGuard,
  ],
})
export class AuthorizationModule {}
