export type OrganizationRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  role: OrganizationRole;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationDetails = OrganizationSummary & {
  invitationCount: number;
};

export type OrganizationMember = {
  user: { id: string; name: string; email: string };
  role: OrganizationRole;
  joinedAt: string;
};

export type InvitationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

export type OrganizationInvitation = {
  id: string;
  email: string;
  role: OrganizationRole;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  invitedBy: { id: string; name: string; email: string };
};
