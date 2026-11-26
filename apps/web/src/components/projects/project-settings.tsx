'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { ApiError } from '@/lib/auth/api';
import { listMembers as listOrganizationMembers } from '@/lib/organizations/api';
import type { OrganizationMember } from '@/lib/organizations/types';
import {
  addProjectMember,
  archiveProject,
  getProject,
  removeProjectMember,
  updateProject,
  updateProjectMemberRole,
} from '@/lib/projects/api';
import type { ProjectDetails, ProjectRole } from '@/lib/projects/types';

export function ProjectSettings({
  organizationId,
  projectId,
}: {
  organizationId: string;
  projectId: string;
}) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [organizationMembers, setOrganizationMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [projectResponse, membersResponse] = await Promise.all([
        getProject(organizationId, projectId),
        listOrganizationMembers(organizationId),
      ]);
      setProject(projectResponse.project);
      setOrganizationMembers(membersResponse.members);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Unable to load project settings.',
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId, projectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await updateProject(organizationId, projectId, {
        name: String(form.get('name') ?? '').trim(),
        key: String(form.get('key') ?? '').trim().toUpperCase(),
        description: String(form.get('description') ?? '').trim() || null,
      });
      setProject(response.project);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to update the project.');
    } finally {
      setWorking(false);
    }
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      await addProjectMember(organizationId, projectId, {
        userId: String(form.get('userId') ?? ''),
        role: String(form.get('role') ?? 'MEMBER') as ProjectRole,
      });
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to add the project member.');
    } finally {
      setWorking(false);
    }
  }

  async function handleRoleChange(userId: string, role: ProjectRole) {
    setWorking(true);
    setError('');
    try {
      await updateProjectMemberRole(organizationId, projectId, userId, role);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to update the project role.');
    } finally {
      setWorking(false);
    }
  }

  async function handleRemove(userId: string, name: string) {
    if (!window.confirm(`Remove ${name} from this project?`)) return;
    setWorking(true);
    setError('');
    try {
      await removeProjectMember(organizationId, projectId, userId);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to remove the project member.');
    } finally {
      setWorking(false);
    }
  }

  async function handleArchive() {
    if (!project || !window.confirm(`Archive ${project.name}? Its tasks will become read-only.`)) return;
    setWorking(true);
    setError('');
    try {
      await archiveProject(organizationId, projectId);
      router.replace(`/organizations/${organizationId}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to archive the project.');
      setWorking(false);
    }
  }

  const availableMembers = organizationMembers.filter(
    (member) =>
      !project?.memberships.some(
        (projectMember) => projectMember.user.id === member.user.id,
      ),
  );
  const canManage = project?.role === 'PROJECT_MANAGER' && !project.archivedAt;

  return (
    <DashboardShell
      title={project?.name ?? 'Project settings'}
      description={project ? `${project.key} · Project settings and membership` : 'Loading project…'}
      actions={
        project ? (
          <Link
            href={`/organizations/${organizationId}/projects/${projectId}`}
            className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-slate-800"
          >
            Back to tasks
          </Link>
        ) : null
      }
    >
      {loading ? (
        <div role="status" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">
          Loading project settings…
        </div>
      ) : error && !project ? (
        <div role="alert" className="rounded-2xl border border-red-900/60 bg-red-950/40 p-6 text-red-300">
          {error}
        </div>
      ) : project ? (
        <div className="space-y-6">
          {error ? (
            <div role="alert" className="rounded-xl border border-red-900/60 bg-red-950/40 p-4 text-red-300">
              {error}
            </div>
          ) : null}
          {project.archivedAt ? (
            <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 p-4 text-sm text-amber-300">
              This project is archived and read-only.
            </div>
          ) : project.role !== 'PROJECT_MANAGER' ? (
            <div className="rounded-xl border border-blue-900/60 bg-blue-950/30 p-4 text-sm text-blue-200">
              Only project managers can change settings or membership.
            </div>
          ) : null}

          <form className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6" onSubmit={handleSave}>
            <h2 className="text-xl font-semibold">Project details</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Name
                <input name="name" defaultValue={project.name} required minLength={2} maxLength={120} disabled={!canManage || working} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 disabled:opacity-60" />
              </label>
              <label className="block text-sm font-medium">
                Key
                <input name="key" defaultValue={project.key} required minLength={2} maxLength={10} pattern="[A-Za-z][A-Za-z0-9]*" disabled={!canManage || working} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 uppercase disabled:opacity-60" />
              </label>
            </div>
            <label className="mt-4 block text-sm font-medium">
              Description
              <textarea name="description" defaultValue={project.description ?? ''} rows={4} maxLength={10000} disabled={!canManage || working} className="mt-2 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 disabled:opacity-60" />
            </label>
            {canManage ? (
              <div className="mt-5 flex flex-wrap justify-between gap-3">
                <button type="button" onClick={() => void handleArchive()} disabled={working} className="rounded-lg border border-red-900 px-4 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-950/50 disabled:opacity-60">
                  Archive project
                </button>
                <button type="submit" disabled={working} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-60">
                  {working ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            ) : null}
          </form>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold">Workflow</h2>
            <p className="mt-1 text-sm text-slate-400">Default columns created with this project.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {project.workflowColumns.map((column) => (
                <div key={column.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color ?? '#64748b' }} />
                  <span className="ml-2 text-sm font-semibold">{column.name}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold">Project members</h2>
            {canManage && availableMembers.length > 0 ? (
              <form className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]" onSubmit={handleAddMember}>
                <select name="userId" required disabled={working} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5">
                  <option value="">Select organization member</option>
                  {availableMembers.map((member) => (
                    <option key={member.user.id} value={member.user.id}>{member.user.name} ({member.user.email})</option>
                  ))}
                </select>
                <select name="role" defaultValue="MEMBER" disabled={working} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5">
                  <option value="MEMBER">Member</option>
                  <option value="PROJECT_MANAGER">Project manager</option>
                </select>
                <button type="submit" disabled={working} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-60">Add member</button>
              </form>
            ) : null}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-3 py-3">Member</th><th className="px-3 py-3">Role</th><th className="px-3 py-3 text-right">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {project.memberships.map((membership) => (
                    <tr key={membership.user.id}>
                      <td className="px-3 py-4"><p className="font-medium text-white">{membership.user.name}</p><p className="text-xs text-slate-500">{membership.user.email}</p></td>
                      <td className="px-3 py-4">
                        {canManage ? (
                          <select value={membership.role} disabled={working} onChange={(event) => void handleRoleChange(membership.user.id, event.target.value as ProjectRole)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
                            <option value="MEMBER">Member</option>
                            <option value="PROJECT_MANAGER">Project manager</option>
                          </select>
                        ) : membership.role === 'PROJECT_MANAGER' ? 'Project manager' : 'Member'}
                      </td>
                      <td className="px-3 py-4 text-right">
                        {canManage ? (
                          <button type="button" disabled={working} onClick={() => void handleRemove(membership.user.id, membership.user.name)} className="text-sm font-semibold text-red-400 hover:text-red-300 disabled:opacity-60">Remove</button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </DashboardShell>
  );
}
