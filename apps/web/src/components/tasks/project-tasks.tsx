'use client';

import { useCallback, useEffect, useState } from 'react';
import { AccessDenied } from '@/components/authorization/access-denied';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { ApiError } from '@/lib/auth/api';
import { useOrganizations } from '@/lib/organizations/organization-context';
import { listAssignableMembers, listTasks } from '@/lib/tasks/api';
import type {
  AssignableProjectMember,
  ProjectTaskContext,
  Task,
  TaskPriority,
  TaskStatus,
} from '@/lib/tasks/types';
import { CreateTaskDialog } from './create-task-dialog';
import { TaskDetailsPanel } from './task-details-panel';

const priorityStyles: Record<TaskPriority, string> = {
  LOW: 'bg-slate-800 text-slate-300',
  MEDIUM: 'bg-blue-950 text-blue-300',
  HIGH: 'bg-amber-950 text-amber-300',
  URGENT: 'bg-red-950 text-red-300',
};

const statusLabels: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
};

export function ProjectTasks({
  organizationId,
  projectId,
}: {
  organizationId: string;
  projectId: string;
}) {
  const { selectOrganization } = useOrganizations();
  const [project, setProject] = useState<ProjectTaskContext | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<AssignableProjectMember[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const limit = 12;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setAccessDenied(false);
    try {
      const [taskResponse, memberResponse] = await Promise.all([
        listTasks(organizationId, projectId, page, limit),
        listAssignableMembers(organizationId, projectId),
      ]);
      setProject(taskResponse.project);
      setTasks(taskResponse.tasks);
      setTotal(taskResponse.total);
      setMembers(memberResponse.members);
      setSelectedTask((current) =>
        current
          ? taskResponse.tasks.find((task) => task.id === current.id) ?? null
          : null,
      );
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 403) {
        setAccessDenied(true);
      } else {
        setError(
          caught instanceof ApiError
            ? caught.message
            : 'Unable to load project tasks.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [organizationId, page, projectId]);

  useEffect(() => {
    selectOrganization(organizationId);
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, organizationId, selectOrganization]);

  function handleTaskChanged(task: Task) {
    setSelectedTask(task);
    setTasks((current) =>
      current.map((item) => (item.id === task.id ? task : item)),
    );
  }

  function handleTaskCreated(task: Task) {
    setCreateOpen(false);
    setSelectedTask(task);
    if (page === 1) {
      setTasks((current) => [task, ...current].slice(0, limit));
      setTotal((current) => current + 1);
    } else {
      setPage(1);
    }
  }

  function handleTaskArchived(taskId: string) {
    setSelectedTask(null);
    setTasks((current) => current.filter((task) => task.id !== taskId));
    setTotal((current) => Math.max(0, current - 1));
    void load();
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <DashboardShell
      title={project?.name ?? 'Project tasks'}
      description={
        project
          ? `${project.key} · ${project.description ?? 'Plan and track project work.'}`
          : 'Loading project details…'
      }
      actions={
        project && !project.archivedAt ? (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500"
          >
            Create task
          </button>
        ) : null
      }
    >
      {accessDenied ? (
        <AccessDenied message="You are not authorized to work with tasks in this project." />
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-red-900/60 bg-red-950/40 p-6 text-red-300">
          {error}
        </div>
      ) : loading ? (
        <div role="status" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">
          Loading project tasks…
        </div>
      ) : project ? (
        <div className="space-y-6">
          {project.archivedAt ? (
            <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 p-4 text-sm text-amber-300">
              This project is archived and its tasks are read-only.
            </div>
          ) : null}
          {tasks.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-10 text-center">
              <h2 className="text-xl font-semibold">No tasks yet</h2>
              <p className="mt-2 text-sm text-slate-400">
                Create the first task to start tracking project work.
              </p>
              {!project.archivedAt ? (
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500"
                >
                  Create first task
                </button>
              ) : null}
            </section>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {tasks.map((task) => {
                const completedSubtasks = task.subtasks.filter(
                  (subtask) => subtask.isCompleted,
                ).length;
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => setSelectedTask(task)}
                    className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-left transition hover:border-slate-600 hover:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                        {project.key}-{task.number}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityStyles[task.priority]}`}>
                        {task.priority.toLowerCase()}
                      </span>
                    </div>
                    <h2 className="mt-4 line-clamp-2 text-lg font-semibold text-white">
                      {task.title}
                    </h2>
                    <p className="mt-3 line-clamp-2 min-h-10 text-sm text-slate-400">
                      {task.description || 'No description'}
                    </p>
                    <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="rounded-full bg-slate-800 px-2.5 py-1">
                        {statusLabels[task.status]}
                      </span>
                      <span>{task.assignees.length} assignees</span>
                      <span>
                        {completedSubtasks}/{task.subtasks.length} subtasks
                      </span>
                    </div>
                    <p className={`mt-4 text-xs ${task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'text-red-400' : 'text-slate-500'}`}>
                      {task.dueDate
                        ? `Due ${new Date(task.dueDate).toLocaleString()}`
                        : 'No due date'}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {totalPages > 1 ? (
            <nav className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3" aria-label="Task pagination">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-slate-400">
                Page {page} of {totalPages} · {total} tasks
              </span>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </nav>
          ) : null}
        </div>
      ) : null}

      {createOpen && project ? (
        <CreateTaskDialog
          organizationId={organizationId}
          projectId={projectId}
          members={members}
          onClose={() => setCreateOpen(false)}
          onCreated={handleTaskCreated}
        />
      ) : null}
      {selectedTask && project ? (
        <TaskDetailsPanel
          task={selectedTask}
          projectKey={project.key}
          members={members}
          onClose={() => setSelectedTask(null)}
          onChanged={handleTaskChanged}
          onArchived={handleTaskArchived}
        />
      ) : null}
    </DashboardShell>
  );
}
