'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { ApiError } from '@/lib/auth/api';
import { createOrganization } from '@/lib/organizations/api';
import { useOrganizations } from '@/lib/organizations/organization-context';

const SLUG_FORMAT_HELP =
  'Use 3–50 lowercase letters or numbers, with single hyphens between words. Example: chero-labs-dev.';

function getSlugValidationMessage(input: HTMLInputElement): string {
  if (input.validity.tooShort) {
    return 'The slug must contain at least 3 characters.';
  }
  if (input.validity.tooLong) {
    return 'The slug cannot contain more than 50 characters.';
  }
  if (input.validity.patternMismatch) {
    return 'Use only lowercase letters (a–z), numbers (0–9), and single hyphens between words. Do not use spaces, underscores, or consecutive hyphens.';
  }
  return '';
}

export default function OrganizationsPage() {
  const { organizations, isLoading, error: loadError, reloadOrganizations, selectOrganization } = useOrganizations();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [slugError, setSlugError] = useState('');

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const slug = String(form.get('slug') ?? '').trim();
    try {
      const organization = await createOrganization({
        name: String(form.get('name') ?? '').trim(),
        ...(slug ? { slug } : {}),
      });
      await reloadOrganizations();
      selectOrganization(organization.id);
      formElement.reset();
      setSlugError('');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to create the organization.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardShell title="Organizations" description="Create and switch between isolated SyncFlow workspaces.">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section>
          {isLoading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">Loading organizations…</div>
          ) : loadError ? (
            <div role="alert" className="rounded-2xl border border-red-900/60 bg-red-950/40 p-6 text-red-300">{loadError}</div>
          ) : organizations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center text-slate-400">No organizations yet. Create one to begin.</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {organizations.map((organization) => (
                <Link key={organization.id} href={`/organizations/${organization.id}`} onClick={() => selectOrganization(organization.id)} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-blue-700 hover:bg-slate-900">
                  <h2 className="font-semibold text-white">{organization.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">/{organization.slug}</p>
                  <p className="mt-4 text-sm text-slate-400">{organization.memberCount} members · {organization.role}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
        <section className="h-fit rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold">Create organization</h2>
          <p className="mt-1 text-sm text-slate-400">You will become its first owner.</p>
          <form className="mt-5 space-y-4" onSubmit={handleCreate}>
            {error ? <div role="alert" className="rounded-lg bg-red-950/50 p-3 text-sm text-red-300">{error}</div> : null}
            <label className="block text-sm font-medium">Name<input name="name" required minLength={2} maxLength={100} disabled={submitting} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-blue-500" /></label>
            <label className="block text-sm font-medium">
              Slug <span className="font-normal text-slate-500">(optional)</span>
              <input
                name="slug"
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                minLength={3}
                maxLength={50}
                disabled={submitting}
                placeholder="chero-labs-dev"
                title={SLUG_FORMAT_HELP}
                aria-invalid={slugError ? true : undefined}
                aria-describedby="organization-slug-help"
                onInvalid={(event) => {
                  event.preventDefault();
                  setSlugError(getSlugValidationMessage(event.currentTarget));
                }}
                onBlur={(event) => {
                  if (event.currentTarget.value && !event.currentTarget.validity.valid) {
                    setSlugError(getSlugValidationMessage(event.currentTarget));
                  }
                }}
                onInput={(event) => {
                  if (slugError) {
                    setSlugError(getSlugValidationMessage(event.currentTarget));
                  }
                }}
                className={`mt-2 w-full rounded-lg border bg-slate-950 px-3 py-2.5 outline-none focus:border-blue-500 ${slugError ? 'border-red-500' : 'border-slate-700'}`}
              />
              <span
                id="organization-slug-help"
                role={slugError ? 'alert' : undefined}
                className={`mt-2 block text-xs ${slugError ? 'text-red-300' : 'font-normal text-slate-500'}`}
              >
                {slugError || SLUG_FORMAT_HELP}
              </span>
            </label>
            <button type="submit" disabled={submitting} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-60">{submitting ? 'Creating…' : 'Create organization'}</button>
          </form>
        </section>
      </div>
    </DashboardShell>
  );
}
