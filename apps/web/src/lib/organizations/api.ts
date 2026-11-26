import { apiRequest } from '@/lib/auth/api';
import type {
  InvitationCreationResponse,
  InvitationDeliveryMethod,
  OrganizationDetails,
  OrganizationInvitation,
  OrganizationMember,
  OrganizationRole,
  OrganizationSummary,
} from './types';

export function listOrganizations() {
  return apiRequest<{ organizations: OrganizationSummary[] }>('/organizations');
}

export function createOrganization(input: { name: string; slug?: string }) {
  return apiRequest<OrganizationSummary>(
    '/organizations',
    { method: 'POST', body: JSON.stringify(input) },
    true,
  );
}

export function getOrganization(organizationId: string) {
  return apiRequest<{ organization: OrganizationDetails }>(
    `/organizations/${organizationId}`,
  );
}

export function updateOrganization(
  organizationId: string,
  input: { name: string; slug: string },
) {
  return apiRequest<{ organization: OrganizationDetails }>(
    `/organizations/${organizationId}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    true,
  );
}

export function listMembers(organizationId: string) {
  return apiRequest<{
    members: OrganizationMember[];
    total: number;
    page: number;
    limit: number;
  }>(`/organizations/${organizationId}/members?limit=100`);
}

export function updateMemberRole(
  organizationId: string,
  userId: string,
  role: OrganizationRole,
) {
  return apiRequest(
    `/organizations/${organizationId}/members/${userId}`,
    { method: 'PATCH', body: JSON.stringify({ role }) },
    true,
  );
}

export function removeMember(organizationId: string, userId: string) {
  return apiRequest<void>(
    `/organizations/${organizationId}/members/${userId}`,
    { method: 'DELETE' },
    true,
  );
}

export function listInvitations(organizationId: string) {
  return apiRequest<{
    invitations: OrganizationInvitation[];
    total: number;
    page: number;
    limit: number;
  }>(`/organizations/${organizationId}/invitations?limit=100`);
}

export function inviteMember(
  organizationId: string,
  input: {
    email: string;
    role: OrganizationRole;
    delivery: InvitationDeliveryMethod;
  },
) {
  return apiRequest<InvitationCreationResponse>(
    `/organizations/${organizationId}/invitations`,
    { method: 'POST', body: JSON.stringify(input) },
    true,
  );
}

export function cancelInvitation(organizationId: string, invitationId: string) {
  return apiRequest<void>(
    `/organizations/${organizationId}/invitations/${invitationId}`,
    { method: 'DELETE' },
    true,
  );
}

export function getInvitation(token: string) {
  return apiRequest<{
    invitation: {
      organization: { id: string; name: string; slug: string };
      email: string;
      role: OrganizationRole;
      expiresAt: string;
    };
  }>(`/invitations/${encodeURIComponent(token)}`);
}

export function acceptInvitation(token: string) {
  return apiRequest<{
    organization: { id: string; name: string; slug: string };
    role: OrganizationRole;
  }>(
    `/invitations/${encodeURIComponent(token)}/accept`,
    { method: 'POST' },
    true,
  );
}

export function rejectInvitation(token: string) {
  return apiRequest<void>(
    `/invitations/${encodeURIComponent(token)}/reject`,
    { method: 'POST' },
    true,
  );
}
