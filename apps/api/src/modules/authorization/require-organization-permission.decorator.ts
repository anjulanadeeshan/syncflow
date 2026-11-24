import { SetMetadata } from '@nestjs/common';
import type { OrganizationPermission } from './permissions.js';

export const ORGANIZATION_PERMISSION_METADATA =
  'syncflow:organization-permission';

export const RequireOrganizationPermission = (
  permission: OrganizationPermission,
) => SetMetadata(ORGANIZATION_PERMISSION_METADATA, permission);
