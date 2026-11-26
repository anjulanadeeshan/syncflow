'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/auth/api';
import { useAuth } from '@/lib/auth/auth-context';
import {
  acceptInvitation,
  getInvitation,
  rejectInvitation,
} from '@/lib/organizations/api';
import { useOrganizations } from '@/lib/organizations/organization-context';
import type { OrganizationRole } from '@/lib/organizations/types';

type InvitationPreview = {
  organization: { id: string; name: string; slug: string };
  email: string;
  role: OrganizationRole;
  expiresAt: string;
};

export function InvitationAcceptance() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const { reloadOrganizations, selectOrganization } = useOrganizations();
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      setToken(hash.get('token') ?? '');
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (authLoading || !token || !user) return;
    let active = true;
    getInvitation(token)
      .then((response) => {
        if (active) setInvitation(response.invitation);
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof ApiError ? caught.message : 'Unable to load this invitation.');
          setErrorCode(caught instanceof ApiError ? caught.code : '');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authLoading, token, user]);

  async function handleAccept() {
    setSubmitting(true);
    setError('');
    setErrorCode('');
    try {
      const response = await acceptInvitation(token);
      await reloadOrganizations();
      selectOrganization(response.organization.id);
      router.replace(`/organizations/${response.organization.id}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to accept this invitation.');
      setErrorCode(caught instanceof ApiError ? caught.code : '');
      setSubmitting(false);
    }
  }

  async function handleReject() {
    setSubmitting(true);
    setError('');
    setErrorCode('');
    try {
      await rejectInvitation(token);
      setRejected(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to reject this invitation.');
      setErrorCode(caught instanceof ApiError ? caught.code : '');
    } finally {
      setSubmitting(false);
    }
  }

  const returnPath = `/invitations/accept#token=${encodeURIComponent(token)}`;

  async function handleSwitchAccount() {
    setSwitchingAccount(true);
    try {
      await logout();
    } finally {
      router.replace(`/login?next=${encodeURIComponent(returnPath)}`);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
      <section className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl sm:p-8">
        <Link href="/" className="text-xl font-bold">
          Sync<span className="text-blue-400">Flow</span>
        </Link>

        {!token || authLoading || (Boolean(user) && loading) ? (
          <p className="mt-8 text-slate-400">Loading invitation...</p>
        ) : !user ? (
          <div className="mt-8">
            <h1 className="text-2xl font-semibold">Sign in to continue</h1>
            <p className="mt-3 text-slate-400">
              Invitation acceptance is tied to the invited email address.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/login?next=${encodeURIComponent(returnPath)}`}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold hover:bg-blue-500"
              >
                Sign in
              </Link>
              <Link
                href={`/register?next=${encodeURIComponent(returnPath)}`}
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-center text-sm font-semibold hover:bg-slate-800"
              >
                Create account
              </Link>
            </div>
          </div>
        ) : rejected ? (
          <div className="mt-8">
            <h1 className="text-2xl font-semibold">Invitation rejected</h1>
            <p className="mt-3 text-slate-400">The invitation can no longer be used.</p>
            <Link href="/dashboard" className="mt-6 inline-flex text-sm font-semibold text-blue-400">
              Return to dashboard
            </Link>
          </div>
        ) : error ? (
          <div className="mt-8">
            <h1 className="text-2xl font-semibold">Invitation unavailable</h1>
            <p role="alert" className="mt-3 text-red-300">{error}</p>
            {errorCode === 'INVITATION_EMAIL_MISMATCH' ? (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-slate-400">
                  Sign out and use the email address that received this invitation.
                </p>
                <button
                  type="button"
                  onClick={() => void handleSwitchAccount()}
                  disabled={switchingAccount}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-60 sm:w-auto"
                >
                  {switchingAccount ? 'Signing out...' : 'Sign in with another account'}
                </button>
              </div>
            ) : null}
            <Link href="/dashboard" className="mt-6 inline-flex text-sm font-semibold text-blue-400">
              Return to dashboard
            </Link>
          </div>
        ) : invitation ? (
          <div className="mt-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">
              Organization invitation
            </p>
            <h1 className="mt-3 text-3xl font-semibold">Join {invitation.organization.name}</h1>
            <p className="mt-3 text-slate-400">
              You were invited as{' '}
              <strong className="text-slate-200">{invitation.role.toLowerCase()}</strong> using{' '}
              {invitation.email}.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Expires {new Date(invitation.expiresAt).toLocaleString()}
            </p>
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleReject}
                disabled={submitting}
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={submitting}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-60"
              >
                {submitting ? 'Working...' : 'Accept invitation'}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
