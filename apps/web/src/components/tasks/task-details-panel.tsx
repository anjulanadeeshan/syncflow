'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/auth/api';
import {
  archiveTask,
  createSubtask,
  deleteSubtask,
  updateSubtask,
  updateTask,
} from '@/lib/tasks/api';
import type {
  AssignableProjectMember,
  Subtask,
  Task,
  TaskPriority,
  TaskStatus,
} from '@/lib/tasks/types';

function toLocalDateTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function TaskDetailsPanel({
  task,
  projectKey,
  members,
  onClose,
  onChanged,
  onArchived,
}: {
  task: Task;
  projectKey: string;
  members: AssignableProjectMember[];
  onClose: () => void;
  onChanged: (task: Task) => void;
  onArchived: (taskId: string) => void;
}) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function showError(caught: unknown, fallback: string) {
    setError(caught instanceof ApiError ? caught.message : fallback);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const dueDate = String(form.get('dueDate') ?? '');
    try {
      const response = await updateTask(
        task.organizationId,
        task.projectId,
        task.id,
        {
          version: task.version,
          title: String(form.get('title') ?? '').trim(),
          description: String(form.get('description') ?? '').trim() || null,
          priority: String(form.get('priority')) as TaskPriority,
          status: String(form.get('status')) as TaskStatus,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          assigneeIds: form.getAll('assigneeIds').map(String),
        },
      );
      onChanged(response.task);
    } catch (caught) {
      showError(caught, 'Unable to update this task.');
    } finally {
      setWorking(false);
    }
  }

  async function handleArchive() {
    if (!window.confirm(`Archive ${projectKey}-${task.number}?`)) return;
    setWorking(true);
    setError('');
    try {
      await archiveTask(
        task.organizationId,
        task.projectId,
        task.id,
        task.version,
      );
      onArchived(task.id);
    } catch (caught) {
      showError(caught, 'Unable to archive this task.');
    } finally {
      setWorking(false);
    }
  }

  async function handleAddSubtask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setWorking(true);
    setError('');
    try {
      const response = await createSubtask(
        task.organizationId,
        task.projectId,
        task.id,
        {
          title: String(form.get('title') ?? '').trim(),
          taskVersion: task.version,
        },
      );
      formElement.reset();
      onChanged(response.task);
    } catch (caught) {
      showError(caught, 'Unable to add this subtask.');
    } finally {
      setWorking(false);
    }
  }

  async function handleToggle(subtask: Subtask, isCompleted: boolean) {
    setWorking(true);
    setError('');
    try {
      const response = await updateSubtask(
        task.organizationId,
        task.projectId,
        task.id,
        subtask.id,
        { taskVersion: task.version, isCompleted },
      );
      onChanged(response.task);
    } catch (caught) {
      showError(caught, 'Unable to update this subtask.');
    } finally {
      setWorking(false);
    }
  }

  async function handleRename(subtask: Subtask) {
    const title = window.prompt('Edit subtask title', subtask.title)?.trim();
    if (!title || title === subtask.title) return;
    setWorking(true);
    setError('');
    try {
      const response = await updateSubtask(
        task.organizationId,
        task.projectId,
        task.id,
        subtask.id,
        { taskVersion: task.version, title },
      );
      onChanged(response.task);
    } catch (caught) {
      showError(caught, 'Unable to edit this subtask.');
    } finally {
      setWorking(false);
    }
  }

  async function handleDelete(subtask: Subtask) {
    if (!window.confirm(`Delete "${subtask.title}"?`)) return;
    setWorking(true);
    setError('');
    try {
      const response = await deleteSubtask(
        task.organizationId,
        task.projectId,
        task.id,
        subtask.id,
        task.version,
      );
      onChanged(response.task);
    } catch (caught) {
      showError(caught, 'Unable to delete this subtask.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70" role="presentation">
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-panel-title"
        className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-400">
              {projectKey}-{task.number}
            </p>
            <h2 id="task-panel-title" className="mt-1 text-2xl font-semibold">
              Task details
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close task details"
            className="rounded-lg px-3 py-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ×
          </button>
        </div>

        {error ? (
          <div role="alert" className="mt-5 rounded-lg bg-red-950/50 p-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <form key={task.version} className="mt-6 space-y-5" onSubmit={handleSave}>
          <label className="block text-sm font-medium">
            Title
            <input
              name="title"
              defaultValue={task.title}
              required
              maxLength={200}
              disabled={working}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5"
            />
          </label>
          <label className="block text-sm font-medium">
            Description
            <textarea
              name="description"
              defaultValue={task.description ?? ''}
              rows={5}
              maxLength={20000}
              disabled={working}
              className="mt-2 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-medium">
              Priority
              <select name="priority" defaultValue={task.priority} disabled={working} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Status
              <select name="status" defaultValue={task.status} disabled={working} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5">
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="DONE">Done</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Due date
              <input
                name="dueDate"
                type="datetime-local"
                defaultValue={toLocalDateTime(task.dueDate)}
                disabled={working}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5"
              />
            </label>
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Assignees</legend>
            <div className="mt-2 grid gap-2 rounded-lg border border-slate-800 bg-slate-950/70 p-3 sm:grid-cols-2">
              {members.map((member) => (
                <label key={member.user.id} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="assigneeIds"
                    value={member.user.id}
                    defaultChecked={task.assignees.some(
                      (assignee) => assignee.id === member.user.id,
                    )}
                    disabled={working}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                  />
                  {member.user.name}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap justify-between gap-3">
            <button
              type="button"
              onClick={() => void handleArchive()}
              disabled={working}
              className="rounded-lg border border-red-900 px-4 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-950/50 disabled:opacity-60"
            >
              Archive task
            </button>
            <button
              type="submit"
              disabled={working}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-60"
            >
              {working ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>

        <section className="mt-10 border-t border-slate-800 pt-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Subtasks</h3>
              <p className="mt-1 text-sm text-slate-400">
                {task.subtasks.filter((item) => item.isCompleted).length} of{' '}
                {task.subtasks.length} completed
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {task.subtasks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-500">
                No subtasks yet.
              </p>
            ) : (
              task.subtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <input
                    type="checkbox"
                    checked={subtask.isCompleted}
                    disabled={working}
                    onChange={(event) => void handleToggle(subtask, event.target.checked)}
                    aria-label={`Complete ${subtask.title}`}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                  />
                  <span className={`min-w-0 flex-1 text-sm ${subtask.isCompleted ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                    {subtask.title}
                  </span>
                  <button type="button" disabled={working} onClick={() => void handleRename(subtask)} className="text-xs font-semibold text-blue-400 hover:text-blue-300">Edit</button>
                  <button type="button" disabled={working} onClick={() => void handleDelete(subtask)} className="text-xs font-semibold text-red-400 hover:text-red-300">Delete</button>
                </div>
              ))
            )}
          </div>
          <form className="mt-4 flex gap-3" onSubmit={handleAddSubtask}>
            <input
              name="title"
              required
              maxLength={200}
              disabled={working}
              placeholder="Add a subtask"
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5"
            />
            <button
              type="submit"
              disabled={working}
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
            >
              Add
            </button>
          </form>
        </section>
      </aside>
    </div>
  );
}
