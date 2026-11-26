'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/auth/api';
import { canAssignOrganizationRole } from '@/lib/authorization/permissions';
import { inviteMember } from '@/lib/organizations/api';
import type {
  InvitationCreationResponse,
  InvitationDeliveryMethod,
  OrganizationRole,
} from '@/lib/organizations/types';

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
  const [delivery, setDelivery] = useState<InvitationDeliveryMethod>('EMAIL');
  const [result, setResult] = useState<InvitationCreationResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => emailInput.current?.focus(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const invitation = await inviteMember(organizationId, {
        email: String(form.get('email') ?? '').trim(),
        role: String(form.get('role') ?? 'MEMBER') as OrganizationRole,
        delivery,
      });
      setResult(invitation);
      try {
        await onInvited();
      } catch {
        setError(
          'The invitation was created, but the invitation list could not be refreshed. Copy the link before closing this dialog.',
        );
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to create the invitation.');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyInvitationLink() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.invitationUrl);
      setCopied(true);
      setError('');
    } catch {
      setError(
        'The browser could not copy the link automatically. Select the link below and copy it manually.',
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-title"
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="invite-title" className="text-xl font-semibold">Invite a member</h2>
            <p className="mt-1 text-sm text-slate-400">
              Create a secure, expiring link and choose how to share it.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close invitation dialog"
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ×
          </button>
        </div>

        {result ? (
          <div className="mt-6 space-y-4">
            {error ? (
              <div role="alert" className="rounded-lg bg-red-950/50 p-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}
            {result.delivery.status === 'SENT' ? (
              <div role="status" className="rounded-lg bg-emerald-950/50 p-3 text-sm text-emerald-300">
                Invitation email sent. You can also copy the link below.
              </div>
            ) : null}
            {result.delivery.status === 'FAILED' ? (
              <div role="alert" className="rounded-lg bg-amber-950/50 p-3 text-sm text-amber-200">
                The email provider could not send the message. The invitation is still active—copy and share this link instead.
              </div>
            ) : null}
            {result.delivery.status === 'NOT_REQUESTED' ? (
              <div role="status" className="rounded-lg bg-blue-950/50 p-3 text-sm text-blue-200">
                Invitation created. Copy this link and send it to the invited address.
              </div>
            ) : null}
            <label className="block text-sm font-medium">
              Invitation link
              <input
                readOnly
                value={result.invitationUrl}
                onFocus={(event) => event.currentTarget.select()}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-blue-500"
              />
            </label>
            <p className="text-xs text-slate-500">
              This link is single-use, expires automatically, and only works for the invited email address.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium hover:bg-slate-800">
                Done
              </button>
              <button type="button" onClick={() => void copyInvitationLink()} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500">
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {error ? (
              <div role="alert" className="rounded-lg bg-red-950/50 p-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}
            <label className="block text-sm font-medium">
              Email address
              <input
                ref={emailInput}
                name="email"
                type="email"
                required
                maxLength={254}
                disabled={submitting}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-blue-500"
              />
            </label>
            <label className="block text-sm font-medium">
              Role
              <select name="role" disabled={submitting} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-blue-500">
                {(['MEMBER', 'ADMIN', 'OWNER'] as const)
                  .filter((role) => canAssignOrganizationRole(actorRole, role))
                  .map((role) => (
                    <option key={role} value={role}>
                      {role.charAt(0) + role.slice(1).toLowerCase()}
                    </option>
                  ))}
              </select>
            </label>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Delivery</legend>
              <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-700 p-3 hover:border-slate-600">
                <input type="radio" name="delivery" value="EMAIL" checked={delivery === 'EMAIL'} onChange={() => setDelivery('EMAIL')} disabled={submitting} className="mt-1" />
                <span>
                  <span className="block text-sm font-medium">Send invitation email</span>
                  <span className="mt-1 block text-xs text-slate-400">Uses Brevo when configured; the link remains available as a fallback.</span>
                </span>
              </label>
              <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-700 p-3 hover:border-slate-600">
                <input type="radio" name="delivery" value="LINK" checked={delivery === 'LINK'} onChange={() => setDelivery('LINK')} disabled={submitting} className="mt-1" />
                <span>
                  <span className="block text-sm font-medium">Copy invitation link</span>
                  <span className="mt-1 block text-xs text-slate-400">Create the invitation without contacting an email provider.</span>
                </span>
              </label>
            </fieldset>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium hover:bg-slate-800">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-60">
                {submitting ? 'Creating…' : delivery === 'EMAIL' ? 'Create and send' : 'Create invitation'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
