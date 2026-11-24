'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/auth/api';
import { canAssignOrganizationRole } from '@/lib/authorization/permissions';
import { inviteMember } from '@/lib/organizations/api';
import type { OrganizationRole } from '@/lib/organizations/types';

export function InviteMemberModal({
  organizationId,
  actorRole,
  onClose,
  onInvited,
}: {
  organizationId: string;
  actorRole: OrganizationRole;
  onClose: () => void;
  onInvited: () => Promise<void>;
}) {
  const emailInput = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => emailInput.current?.focus(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      await inviteMember(organizationId, {
        email: String(form.get('email') ?? '').trim(),
        role: String(form.get('role') ?? 'MEMBER') as OrganizationRole,
      });
      await onInvited();
      onClose();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to send the invitation.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="invite-title" className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><h2 id="invite-title" className="text-xl font-semibold">Invite a member</h2><p className="mt-1 text-sm text-slate-400">A secure, expiring link will be sent by email.</p></div><button type="button" onClick={onClose} aria-label="Close invitation dialog" className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white">×</button></div>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {error ? <div role="alert" className="rounded-lg bg-red-950/50 p-3 text-sm text-red-300">{error}</div> : null}
          <label className="block text-sm font-medium">Email address<input ref={emailInput} name="email" type="email" required maxLength={254} disabled={submitting} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-blue-500" /></label>
          <label className="block text-sm font-medium">Role<select name="role" disabled={submitting} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-blue-500">{(['MEMBER', 'ADMIN', 'OWNER'] as const).filter((role) => canAssignOrganizationRole(actorRole, role)).map((role) => <option key={role} value={role}>{role.charAt(0) + role.slice(1).toLowerCase()}</option>)}</select></label>
          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium hover:bg-slate-800">Cancel</button><button type="submit" disabled={submitting} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-60">{submitting ? 'Sending…' : 'Send invitation'}</button></div>
        </form>
      </section>
    </div>
  );
}
