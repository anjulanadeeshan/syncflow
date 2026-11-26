'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/auth/api';
import { createProject } from '@/lib/projects/api';
import type { ProjectDetails } from '@/lib/projects/types';

export function CreateProjectDialog({
  organizationId,
  onClose,
  onCreated,
}: {
  organizationId: string;
  onClose: () => void;
  onCreated: (project: ProjectDetails) => void;
}) {
  const nameInput = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    nameInput.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await createProject(organizationId, {
        name: String(form.get('name') ?? '').trim(),
        key: String(form.get('key') ?? '').trim().toUpperCase(),
        description: String(form.get('description') ?? '').trim(),
      });
      onCreated(response.project);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Unable to create the project.',
      );
    } finally {
      setSubmitting(false);
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
        aria-labelledby="create-project-title"
        className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="create-project-title" className="text-xl font-semibold">
              Create project
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              You will become the project manager. A default workflow will be created automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close create project dialog"
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ×
          </button>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          {error ? (
            <div role="alert" className="rounded-lg bg-red-950/50 p-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}
          <label className="block text-sm font-medium">
            Project name
            <input
              ref={nameInput}
              name="name"
              required
              minLength={2}
              maxLength={120}
              disabled={submitting}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-blue-500"
            />
          </label>
          <label className="block text-sm font-medium">
            Project key
            <input
              name="key"
              required
              minLength={2}
              maxLength={10}
              pattern="[A-Za-z][A-Za-z0-9]*"
              placeholder="SYNC"
              disabled={submitting}
              onInput={(event) => {
                event.currentTarget.value = event.currentTarget.value.toUpperCase();
              }}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 uppercase outline-none focus:border-blue-500"
            />
            <span className="mt-2 block text-xs font-normal text-slate-500">
              Use 2–10 letters or numbers, starting with a letter. Example: SYNC.
            </span>
          </label>
          <label className="block text-sm font-medium">
            Description <span className="font-normal text-slate-500">(optional)</span>
            <textarea
              name="description"
              rows={4}
              maxLength={10000}
              disabled={submitting}
              className="mt-2 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-blue-500"
            />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-60"
            >
              {submitting ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
