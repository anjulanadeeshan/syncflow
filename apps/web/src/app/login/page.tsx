'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/auth-shell';
import { FormField, SubmitButton } from '@/components/auth/form-fields';
import { ApiError } from '@/lib/auth/api';
import { useAuth } from '@/lib/auth/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, login } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function getDestination() {
    const requested = new URLSearchParams(window.location.search).get('next');
    return requested?.startsWith('/') && !requested.startsWith('//')
      ? requested
      : '/dashboard';
  }

  useEffect(() => {
    if (!isLoading && user) router.replace(getDestination());
  }, [isLoading, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const form = new FormData(event.currentTarget);

    try {
      await login({
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
      });
      router.replace(getDestination());
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Unable to sign in right now. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to continue to your SyncFlow workspace."
      alternateText="New to SyncFlow?"
      alternateHref="/register"
      alternateLabel="Create an account"
    >
      <form method="post" className="space-y-5" onSubmit={handleSubmit}>
        {error ? (
          <div role="alert" className="rounded-lg border border-red-900/60 bg-red-950/50 px-3.5 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}
        <FormField label="Email address" name="email" type="email" autoComplete="email" required disabled={submitting} />
        <FormField label="Password" name="password" type="password" autoComplete="current-password" required disabled={submitting} />
        <SubmitButton loading={submitting}>Sign in</SubmitButton>
      </form>
    </AuthShell>
  );
}
