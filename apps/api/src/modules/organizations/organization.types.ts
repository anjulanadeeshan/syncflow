import {
  ORGANIZATION_ROLES,
  type OrganizationRole,
} from '../authorization/permissions.js';

export { ORGANIZATION_ROLES };
export type OrganizationRoleValue = OrganizationRole;

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  role: OrganizationRoleValue;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
};
