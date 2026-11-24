import { SetMetadata } from '@nestjs/common';
import type { ProjectPermission } from './permissions.js';

export const PROJECT_PERMISSION_METADATA = 'syncflow:project-permission';

export const RequireProjectPermission = (permission: ProjectPermission) =>
  SetMetadata(PROJECT_PERMISSION_METADATA, permission);
