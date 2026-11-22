'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/auth-shell';
import { FormField, SubmitButton } from '@/components/auth/form-fields';
import { ApiError } from '@/lib/auth/api';
import { useAuth } from '@/lib/auth/auth-context';

type FieldErrors = Partial<Record<'name' | 'email' | 'password' | 'confirmPassword', string>>;

export default function RegisterPage() {
  const router = useRouter();
  const { user, isLoading, register } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!isLoading && user) router.replace('/dashboard');
  }, [isLoading, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    const input = {
      name: String(form.get('name') ?? '').trim(),
      email: String(form.get('email') ?? '').trim(),
      password: String(form.get('password') ?? ''),
      confirmPassword: String(form.get('confirmPassword') ?? ''),
    };

    if (input.password !== input.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match.' });
      return;
    }

    setSubmitting(true);
    try {
      await register({ name: input.name, email: input.email, password: input.password });
      router.replace('/dashboard');
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.details.length ? 'Please correct the highlighted fields.' : caught.message);
        setFieldErrors(
          Object.fromEntries(caught.details.map((detail) => [detail.field, detail.messages[0]])) as FieldErrors,
        );
      } else {
        setError('Unable to create your account right now. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      description="Start a secure SyncFlow session. Your first workspace comes in a later phase."
      alternateText="Already have an account?"
      alternateHref="/login"
      alternateLabel="Sign in"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error ? (
          <div role="alert" className="rounded-lg border border-red-900/60 bg-red-950/50 px-3.5 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}
        <FormField label="Full name" name="name" autoComplete="name" minLength={2} maxLength={80} required disabled={submitting} error={fieldErrors.name} />
        <FormField label="Email address" name="email" type="email" autoComplete="email" maxLength={254} required disabled={submitting} error={fieldErrors.email} />
        <FormField label="Password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={submitting} error={fieldErrors.password} />
        <p className="-mt-3 text-xs leading-5 text-slate-500">Use at least 12 characters with uppercase, lowercase, and a number.</p>
        <FormField label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" required disabled={submitting} error={fieldErrors.confirmPassword} />
        <SubmitButton loading={submitting}>Create account</SubmitButton>
      </form>
    </AuthShell>
  );
}
