# SyncFlow Task Management

## Scope

Module 5 adds project-scoped tasks, multiple assignees, and ordered subtasks. It uses the existing `Project`, `ProjectMember`, and authorization foundations without introducing project creation or Kanban board management.

## Data model

### Task

Each task belongs to exactly one project and organization and has:

- a stable project-local task number;
- title and optional description;
- priority: `LOW`, `MEDIUM`, `HIGH`, or `URGENT`;
- status: `TODO`, `IN_PROGRESS`, or `DONE`;
- creator and optional due date;
- optional workflow-column identifier for the Kanban module;
- archival timestamp rather than destructive deletion;
- an optimistic concurrency version;
- created and updated timestamps.

The project stores the next task number. Creating a task increments that counter and creates the task and assignees in one serializable transaction.

### TaskAssignee

`TaskAssignee` is the many-to-many join between tasks and users. Its database foreign keys require the assignee to be a current member of the same project. The API also validates the complete assignee set before writing it.

Removing a project membership cascades its task assignments. It does not delete the task.

### Subtask

Subtasks belong to one task and store title, completion state, and durable checklist position. Subtask creation, updates, completion, and deletion increment the parent task version in the same transaction.

## Authorization and isolation

All routes are nested under an organization and project:

```text
/api/organizations/:organizationId/projects/:projectId/...
```

The project permission guard requires both current organization membership and current membership in the exact project. Organization ownership or administration alone does not grant task access.

Every task, assignee, and subtask query includes organization and project scope. A task identifier from another project or organization returns a non-disclosing `404`.

Both `PROJECT_MANAGER` and project `MEMBER` may work with ordinary tasks under the current MVP permission policy. Archived projects are read-only.

## API routes

| Method | Route suffix | Purpose |
| --- | --- | --- |
| `GET` | `/task-members` | List current project members available for assignment. |
| `GET` | `/tasks` | List active tasks with bounded pagination. |
| `POST` | `/tasks` | Create a task and its assignees transactionally. |
| `GET` | `/tasks/:taskId` | Read one active task. |
| `PATCH` | `/tasks/:taskId` | Update fields and optionally replace assignees. |
| `DELETE` | `/tasks/:taskId?version=N` | Archive a task. |
| `POST` | `/tasks/:taskId/subtasks` | Add an ordered subtask. |
| `PATCH` | `/tasks/:taskId/subtasks/:subtaskId` | Edit or complete a subtask. |
| `DELETE` | `/tasks/:taskId/subtasks/:subtaskId?version=N` | Delete a subtask. |

Task list queries accept `page`, `limit`, and optional `priority` and `status` filters. Results are ordered deterministically by most recent update and task number.

## Concurrency

Task responses contain `version`. Updates, archival, and subtask mutations must submit the version that was loaded. A stale version returns `409 TASK_VERSION_CONFLICT`; the client should reload the authoritative task before retrying.

Assignee replacement and the task update are committed together. Subtask mutations and the parent task version increment are also committed together.

## Frontend

The project task page is located at:

```text
/organizations/:organizationId/projects/:projectId
```

It provides:

- responsive paginated task cards;
- create-task dialog;
- editable task details panel;
- project-member assignee selection;
- priority, status, and due-date controls;
- subtask checklist with create, rename, completion, and deletion;
- loading, empty, error, archived-project, and access-denied states.

The API remains the authorization source of truth. Frontend state never grants project access.

## Deferred Kanban integration

`workflowColumnId` is nullable during Module 5. Module 6 will assign tasks to active workflow columns, persist board ordering, validate column transitions, and provide drag-and-drop plus keyboard movement. The current status remains usable until that integration is added.
