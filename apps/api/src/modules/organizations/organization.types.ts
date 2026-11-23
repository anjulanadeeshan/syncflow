export const ORGANIZATION_ROLES = ['OWNER', 'ADMIN', 'MEMBER'] as const;
export type OrganizationRoleValue = (typeof ORGANIZATION_ROLES)[number];

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  role: OrganizationRoleValue;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
};
