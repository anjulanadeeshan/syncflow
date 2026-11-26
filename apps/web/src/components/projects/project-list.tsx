'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  ORGANIZATION_PERMISSIONS,
  hasOrganizationPermission,
} from '@/lib/authorization/permissions';
import { ApiError } from '@/lib/auth/api';
import type { OrganizationRole } from '@/lib/organizations/types';
import { listProjects } from '@/lib/projects/api';
import type { ProjectDetails, ProjectSummary } from '@/lib/projects/types';
import { CreateProjectDialog } from './create-project-dialog';

export function ProjectList({
  organizationId,
  organizationRole,
}: {
  organizationId: string;
  organizationRole: OrganizationRole;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const canCreate = hasOrganizationPermission(
    organizationRole,
    ORGANIZATION_PERMISSIONS.CREATE_PROJECTS,
  );
  const limit = 12;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await listProjects(organizationId, page, limit);
      setProjects(response.projects);
      setTotal(response.total);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Unable to load projects.',
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function handleCreated(project: ProjectDetails) {
    setCreateOpen(false);
    router.push(`/organizations/${organizationId}/projects/${project.id}`);
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Projects</h2>
          <p className="mt-1 text-sm text-slate-400">
            Only projects where you are an explicit member are shown.
          </p>
        </div>
        {canCreate ? (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500"
          >
            Create project
          </button>
        ) : null}
      </div>

      {loading ? (
        <div role="status" className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">
          Loading projects…
        </div>
      ) : error ? (
        <div role="alert" className="mt-5 rounded-2xl border border-red-900/60 bg-red-950/40 p-6 text-red-300">
          {error}
        </div>
      ) : projects.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-10 text-center">
          <h3 className="text-lg font-semibold">No accessible projects</h3>
          <p className="mt-2 text-sm text-slate-400">
            {canCreate
              ? 'Create the first project for this organization.'
              : 'Ask a project manager to add you to a project.'}
          </p>
          {canCreate ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500"
            >
              Create first project
            </button>
          ) : null}
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/organizations/${organizationId}/projects/${project.id}`}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-blue-700 hover:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                    {project.key}
                  </span>
                  <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                    {project.role === 'PROJECT_MANAGER' ? 'Manager' : 'Member'}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{project.name}</h3>
                <p className="mt-2 line-clamp-2 min-h-10 text-sm text-slate-400">
                  {project.description || 'No description'}
                </p>
                <p className="mt-5 text-xs text-slate-500">
                  {project.memberCount} members · {project.taskCount} tasks
                </p>
              </Link>
            ))}
          </div>
          {totalPages > 1 ? (
            <nav className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3" aria-label="Project pagination">
              <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-40">Previous</button>
              <span className="text-sm text-slate-400">Page {page} of {totalPages} · {total} projects</span>
              <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-40">Next</button>
            </nav>
          ) : null}
        </div>
      )}

      {createOpen ? (
        <CreateProjectDialog
          organizationId={organizationId}
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreated}
        />
      ) : null}
    </section>
  );
}
