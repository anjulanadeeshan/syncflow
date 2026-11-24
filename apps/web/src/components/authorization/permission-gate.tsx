import type { ReactNode } from 'react';
import {
  hasOrganizationPermission,
  type OrganizationPermission,
} from '@/lib/authorization/permissions';
import type { OrganizationRole } from '@/lib/organizations/types';

export function OrganizationPermissionGate({
  role,
  permission,
  children,
  fallback = null,
}: {
  role: OrganizationRole | null | undefined;
  permission: OrganizationPermission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return hasOrganizationPermission(role, permission) ? children : fallback;
}
