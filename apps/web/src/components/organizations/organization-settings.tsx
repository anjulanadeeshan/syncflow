'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { InviteMemberModal } from './invite-member-modal';
import { ApiError } from '@/lib/auth/api';
import {
  cancelInvitation,
  getOrganization,
  listInvitations,
  listMembers,
  removeMember,
  updateMemberRole,
  updateOrganization,
} from '@/lib/organizations/api';
import { useOrganizations } from '@/lib/organizations/organization-context';
import type {
  OrganizationDetails,
  OrganizationInvitation,
  OrganizationMember,
  OrganizationRole,
} from '@/lib/organizations/types';

export function OrganizationSettings({ organizationId }: { organizationId: string }) {
  const { selectOrganization, reloadOrganizations } = useOrganizations();
  const [organization, setOrganization] = useState<OrganizationDetails | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [details, memberResponse] = await Promise.all([
        getOrganization(organizationId),
        listMembers(organizationId),
      ]);
      setOrganization(details.organization);
      setMembers(memberResponse.members);
      if (details.organization.role !== 'MEMBER') {
        const invitationResponse = await listInvitations(organizationId);
        setInvitations(invitationResponse.invitations);
      } else {
        setInvitations([]);
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to load organization settings.');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    selectOrganization(organizationId);
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, organizationId, selectOrganization]);

  async function handleSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    const form = new FormData(event.currentTarget);
    try {
      await updateOrganization(organizationId, {
        name: String(form.get('name') ?? '').trim(),
        slug: String(form.get('slug') ?? '').trim(),
      });
      await Promise.all([load(), reloadOrganizations()]);
      setNotice('Organization settings updated.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to update settings.');
    }
  }

  async function handleRoleChange(userId: string, role: OrganizationRole) {
    setError('');
    try {
      await updateMemberRole(organizationId, userId, role);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to change this role.');
    }
  }

  async function handleRemove(member: OrganizationMember) {
    if (!window.confirm(`Remove ${member.user.name} from this organization?`)) return;
    setError('');
    try {
      await removeMember(organizationId, member.user.id);
      await Promise.all([load(), reloadOrganizations()]);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to remove this member.');
    }
  }

  async function handleCancel(invitation: OrganizationInvitation) {
    if (!window.confirm(`Cancel the invitation for ${invitation.email}?`)) return;
    setError('');
    try {
      await cancelInvitation(organizationId, invitation.id);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to cancel this invitation.');
    }
  }

  const canManage = organization?.role === 'OWNER' || organization?.role === 'ADMIN';

  return (
    <DashboardShell
      title={organization ? `${organization.name} settings` : 'Organization settings'}
      description="Manage workspace identity, members, roles, and invitations."
      actions={canManage ? <button type="button" onClick={() => setInviteOpen(true)} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500">Invite member</button> : null}
    >
      {error ? <div role="alert" className="mb-6 rounded-xl border border-red-900/60 bg-red-950/40 p-4 text-red-300">{error}</div> : null}
      {notice ? <div role="status" className="mb-6 rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-4 text-emerald-300">{notice}</div> : null}
      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">Loading members and invitations…</div>
      ) : organization ? (
        <div className="space-y-8">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-5"><h2 className="text-xl font-semibold">Workspace details</h2><p className="mt-1 text-sm text-slate-400">Only owners can change these settings.</p></div>
            <form key={organization.updatedAt} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={handleSettings}>
              <label className="block text-sm font-medium">Name<input name="name" defaultValue={organization.name} required minLength={2} maxLength={100} disabled={organization.role !== 'OWNER'} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 disabled:opacity-60" /></label>
              <label className="block text-sm font-medium">Slug<input name="slug" defaultValue={organization.slug} required minLength={3} maxLength={50} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" disabled={organization.role !== 'OWNER'} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 disabled:opacity-60" /></label>
              {organization.role === 'OWNER' ? <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500">Save</button> : null}
            </form>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
            <div className="border-b border-slate-800 p-6"><h2 className="text-xl font-semibold">Members</h2><p className="mt-1 text-sm text-slate-400">{members.length} active organization members.</p></div>
            {members.length === 0 ? <p className="p-6 text-slate-400">No members found.</p> : (
              <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-6 py-3">Member</th><th className="px-6 py-3">Role</th><th className="px-6 py-3">Joined</th><th className="px-6 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-800">{members.map((member) => {
                const canRemove = organization.role === 'OWNER' || (organization.role === 'ADMIN' && member.role === 'MEMBER');
                return <tr key={member.user.id}><td className="px-6 py-4"><p className="font-medium text-white">{member.user.name}</p><p className="text-slate-500">{member.user.email}</p></td><td className="px-6 py-4">{organization.role === 'OWNER' ? <select aria-label={`Role for ${member.user.name}`} value={member.role} onChange={(event) => void handleRoleChange(member.user.id, event.target.value as OrganizationRole)} className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2"><option value="OWNER">Owner</option><option value="ADMIN">Admin</option><option value="MEMBER">Member</option></select> : member.role}</td><td className="px-6 py-4 text-slate-400">{new Date(member.joinedAt).toLocaleDateString()}</td><td className="px-6 py-4 text-right">{canRemove ? <button type="button" onClick={() => void handleRemove(member)} className="text-red-400 hover:text-red-300">Remove</button> : <span className="text-slate-600">—</span>}</td></tr>;
              })}</tbody></table></div>
            )}
          </section>

          {canManage ? (
            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
              <div className="border-b border-slate-800 p-6"><h2 className="text-xl font-semibold">Invitations</h2><p className="mt-1 text-sm text-slate-400">Invitation links expire and can only be used once.</p></div>
              {invitations.length === 0 ? <p className="p-6 text-slate-400">No invitations have been sent.</p> : (
                <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-6 py-3">Email</th><th className="px-6 py-3">Role</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Expires</th><th className="px-6 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-800">{invitations.map((invitation) => <tr key={invitation.id}><td className="px-6 py-4"><p className="font-medium text-white">{invitation.email}</p><p className="text-slate-500">by {invitation.invitedBy.name}</p></td><td className="px-6 py-4">{invitation.role}</td><td className="px-6 py-4"><span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold">{invitation.status}</span></td><td className="px-6 py-4 text-slate-400">{new Date(invitation.expiresAt).toLocaleDateString()}</td><td className="px-6 py-4 text-right">{invitation.status === 'PENDING' ? <button type="button" onClick={() => void handleCancel(invitation)} className="text-red-400 hover:text-red-300">Cancel</button> : <span className="text-slate-600">—</span>}</td></tr>)}</tbody></table></div>
              )}
            </section>
          ) : null}
        </div>
      ) : null}
      {inviteOpen && organization ? <InviteMemberModal organizationId={organizationId} actorRole={organization.role} onClose={() => setInviteOpen(false)} onInvited={load} /> : null}
    </DashboardShell>
  );
}
