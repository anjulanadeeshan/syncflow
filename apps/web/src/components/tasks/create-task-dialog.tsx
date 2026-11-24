'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/auth/api';
import { createTask } from '@/lib/tasks/api';
import type {
  AssignableProjectMember,
  Task,
  TaskPriority,
} from '@/lib/tasks/types';

export function CreateTaskDialog({
  organizationId,
  projectId,
  members,
  onClose,
  onCreated,
}: {
  organizationId: string;
  projectId: string;
  members: AssignableProjectMember[];
  onClose: () => void;
  onCreated: (task: Task) => void;
}) {
  const titleInput = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    titleInput.current?.focus();
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
    const dueDate = String(form.get('dueDate') ?? '');
    try {
      const response = await createTask(organizationId, projectId, {
        title: String(form.get('title') ?? '').trim(),
        description: String(form.get('description') ?? '').trim(),
        priority: String(form.get('priority') ?? 'MEDIUM') as TaskPriority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        assigneeIds: form.getAll('assigneeIds').map(String),
      });
      onCreated(response.task);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Unable to create task.',
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
        aria-labelledby="create-task-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="create-task-title" className="text-xl font-semibold">
              Create task
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Add the work, priority, due date, and project assignees.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close create task dialog"
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
            Title
            <input
              ref={titleInput}
              name="title"
              required
              minLength={1}
              maxLength={200}
              disabled={submitting}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-blue-500"
            />
          </label>
          <label className="block text-sm font-medium">
            Description
            <textarea
              name="description"
              rows={4}
              maxLength={20000}
              disabled={submitting}
              className="mt-2 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-blue-500"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Priority
              <select
                name="priority"
                defaultValue="MEDIUM"
                disabled={submitting}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Due date
              <input
                name="dueDate"
                type="datetime-local"
                disabled={submitting}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5"
              />
            </label>
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Assignees</legend>
            <div className="mt-2 max-h-44 space-y-2 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/70 p-3">
              {members.length === 0 ? (
                <p className="text-sm text-slate-500">No project members are available.</p>
              ) : (
                members.map((member) => (
                  <label key={member.user.id} className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      name="assigneeIds"
                      value={member.user.id}
                      disabled={submitting}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                    />
                    <span>
                      {member.user.name}
                      <span className="ml-2 text-slate-500">{member.role}</span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </fieldset>
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
              {submitting ? 'Creating…' : 'Create task'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
