# SyncFlow Development Plan

## 1. Delivery strategy

Development follows vertical slices: each slice includes schema/migration changes, backend rules and authorization, API contract, frontend experience, automated tests, and documentation. The MVP is feature-complete and deployable before advanced infrastructure is introduced.

The proposal's 12-week schedule is retained as an indicative plan for one developer. Scope gates matter more than calendar dates; unfinished required work moves the milestone rather than being hidden by starting optional features.

## 2. Definition of ready and done

### Definition of ready

A feature is ready when it has:

- mapped requirement IDs and acceptance scenarios;
- an identified tenant and authorization scope;
- data/API/UI impacts and failure states;
- accessibility expectations;
- a test plan, including negative permission cases;
- no unresolved decision that changes the feature's fundamental behavior.

### Definition of done

A feature is done when:

- implementation and migrations are reviewed and formatted;
- unit, integration/API, and relevant end-to-end tests pass;
- tenant boundaries and insufficient-role cases are tested;
- loading, empty, error, conflict, and accessibility states are handled;
- API/OpenAPI and relevant documentation are updated;
- logs contain no secrets and operational behavior is observable;
- the production build and container smoke test pass in CI.

## 3. Roadmap overview

| Phase | Indicative time | Outcome | Scope |
| --- | --- | --- | --- |
| 0. Decisions and foundation | Week 1 | Reproducible monorepo and agreed contracts | MVP enabling |
| 1. Identity and application shell | Weeks 1–2 | Secure accounts, sessions, profile, dashboard shell | **MVP required** |
| 2. Organizations and invitations | Weeks 2–3 | Isolated workspaces and member lifecycle | **MVP required** |
| 3. Projects and authorization | Weeks 3–4 | Project lifecycle, membership, and policy enforcement | **MVP required** |
| 4. Tasks and supporting data | Weeks 5–6 | Searchable task/subtask/label workflows | **MVP required** |
| 5. Kanban, comments, activity | Weeks 6–7 | Durable board interaction and traceable collaboration | **MVP required** |
| 6. MVP hardening and release | Weeks 7–8 | Tested, containerized, documented deployment | **MVP required** |
| 7. Live collaboration and files | Weeks 9–10 | Socket.IO notifications and private attachments | Advanced Phase 2 |
| 8. Planning views | Weeks 10–11 | Sprints, estimates, goals, calendar | Advanced Phase 2 |
| 9. Intelligence and automation | Week 12+ | Reports, queues, rules, admin/export | Advanced Phase 3 |

## 4. Feature-by-feature plan

### Phase 0 — decisions and foundation

**Goal:** establish a reliable development path without building product features prematurely.

Deliverables:

1. Record architecture decisions for authentication session model, API error format, ordering strategy, and test framework; npm workspaces are the resolved package-management decision.
2. Create the npm workspace, root task scripts, shared lint/TypeScript/test conventions, and environment validation.
3. Establish Next.js, NestJS, Prisma, PostgreSQL, Tailwind CSS, and shadcn/ui foundations.
4. Define OpenAPI generation and typed client workflow.
5. Configure Docker Compose with PostgreSQL and a development mail catcher.
6. Add baseline GitHub Actions checks and dependency/security update policy.

Exit gate:

- Clean checkout can install, lint, type-check, test a smoke case, build, start dependencies, and validate required environment variables using documented commands.

### Phase 1 — identity and application shell (**MVP required**)

Requirements: `AUTH-01` through `AUTH-06`.

Backend slices:

- user, session, and password-reset schema/migrations;
- registration, login, refresh/session renewal, logout, current-user, profile update, and password reset;
- Argon2id hashing, cookie/CSRF/CORS policy, token rotation, rate limiting, and safe logs;
- authentication guard and request principal.

Frontend slices:

- register, login, forgot/reset password, account profile, protected layout, and signed-out/expired-session handling;
- responsive navigation shell with accessible forms and errors.

Tests:

- password/session/token unit tests;
- API tests for success, invalid credentials, expiry, logout, reset reuse, CSRF/origin failures, and rate limiting;
- browser test for register/login/logout/reset in a mail-catcher environment.

Exit gate:

- An account can complete the full identity lifecycle; stolen/reused/expired credentials fail safely; no tenant feature is needed to verify auth.

### Phase 2 — organizations and invitations (**MVP required**)

Requirements: `ORG-01` through `ORG-06`.

Backend slices:

- organization, membership, invitation schema and constraints;
- organization creation, workspace list, member list, invite issuance/revocation/acceptance, role change, removal, and ownership safeguards;
- organization policy service and tenant-scoped repository base conventions;
- email adapter with local mail capture.

Frontend slices:

- organization creation, workspace switcher, members/roles table, invitation form/status, and invitation acceptance flow.

Tests:

- invitation expiry, duplicate acceptance, email mismatch, final-owner protection, and transactional membership creation;
- a mandatory two-tenant matrix proving no cross-organization reads or writes.

Exit gate:

- Two organizations can be created and managed in one database with automated evidence that identifiers from one tenant cannot access the other.

### Phase 3 — projects and project authorization (**MVP required**)

Requirements: `PROJ-01` through `PROJ-05`.

Backend slices:

- project and project membership schema;
- project creation with default columns, list/view/update/archive, member role management, and project policy service;
- atomic initialization and activity recording.

Frontend slices:

- authorized project list, create/edit/archive flows, project navigation, and project member management;
- clear empty, archived, not-found, and insufficient-permission states.

Tests:

- organization owner/admin project creation;
- project manager/member permission matrix;
- proof that organization membership alone does not expose unrelated projects;
- archive/read-only behavior and default workflow transaction.

Exit gate:

- Project visibility is determined by project membership, and every illustrative project workflow passes with negative access tests.

### Phase 4 — tasks, subtasks, labels, and search (**MVP required**)

Requirements: `TASK-01` through `TASK-08`.

Backend slices:

- task number allocation, task, assignee, subtask, label, and task-label schema;
- task create/read/update/archive, assignments, subtask ordering/completion, label management, filters, text search, and pagination;
- optimistic version checks and transactional activity records.

Frontend slices:

- task list/table and task detail dialog/page;
- create/edit forms, assignee/label controls, subtask checklist, filters, search, pagination, and conflict recovery UI.

Tests:

- unique task numbering under concurrency;
- assignee must be an active project member;
- filter combinations, stable pagination, cross-project child IDs, stale version conflicts, archive behavior, and query-count regression for representative lists.

Exit gate:

- Authorized users can complete the proposal's task workflow without a board, and all task data remains durable and tenant-scoped.

### Phase 5 — Kanban, comments, and activity (**MVP required**)

Requirements: `BOARD-01` through `BOARD-04` and `COLLAB-01` through `COLLAB-05`.

Backend slices:

- workflow column CRUD/reorder/archive and task move/reorder transaction;
- fractional/lexicographic rank generation and rebalance;
- comment create/edit/soft-delete/moderation;
- append-only activity feed and safe change metadata.

Frontend slices:

- responsive Kanban board with pointer and keyboard movement;
- optimistic move with rollback/reload on failure or conflict;
- task discussion and chronological activity UI.

Tests:

- column/task cross-project rejection, minimum-column invariant, concurrent moves/rebalance, refresh persistence;
- comment authorship/moderation, soft deletion, and activity atomicity;
- Playwright journey from project creation through task completion and comments.

Exit gate:

- The complete sample workflow from the proposal works after refresh, including durable task movement, comments, and activity history.

### Phase 6 — MVP hardening and release (**MVP required**)

Deliverables:

1. Complete the cross-tenant and role test matrix for every protected resource.
2. Run accessibility checks and keyboard-only review of primary journeys.
3. Add health/readiness endpoints, structured logging, error tracking, basic metrics, correlation IDs, and redaction verification.
4. Tune indexes and eliminate unbounded/N+1 board and feed queries using representative seed data.
5. Build multi-stage non-root web/API images and a one-shot migration process.
6. Complete GitHub Actions pull-request and deployment workflows.
7. Write setup, environment, migration, backup/restore, deployment, API, and demo usage documentation.
8. Deploy a staging/demo environment with representative, non-sensitive sample data.

Release gate:

- Every MVP acceptance criterion in the requirements document passes; critical/high security findings are resolved; rollback and database restore are rehearsed; advanced features remain feature-disabled or absent.

### Phase 7 — live collaboration, notifications, and files (advanced Phase 2)

Requirements: `ADV-01` through `ADV-03`.

Order of work:

1. Add outbox events and idempotent publishing.
2. Add durable notifications and read/unread API/UI before Socket.IO delivery.
3. Add authenticated Socket.IO gateway, verified user/project rooms, reconnect invalidation, and multi-instance Redis adapter.
4. Add private object storage, attachment metadata, validation, authorization, and cleanup/reconciliation jobs.

Exit gate:

- Dropped/replayed events do not corrupt state, reconnecting clients converge on API state, unauthorized sockets receive no project events, and private file access is tested across tenants.

### Phase 8 — sprints and calendar (advanced Phase 2)

Requirements: `ADV-04` and `ADV-05`.

Deliverables:

- sprint lifecycle, goals, task estimates, sprint assignment, calendar queries and views;
- clear handling of incomplete tasks when closing a sprint;
- date/time-zone rules and accessible calendar alternatives.

Exit gate:

- Sprint and calendar data remains project-scoped and reports consistent task state without changing the core workflow model.

### Phase 9 — analytics, automation, and administration (advanced Phase 3)

Requirements: `ADV-06` through `ADV-11`.

Order of work:

1. Define metric semantics before building dashboards.
2. Add measured tenant-scoped aggregate queries or read models.
3. Add Redis/BullMQ worker, idempotent handlers, retry/dead-letter observability, and scheduled reminders.
4. Add versioned automation rules and execution history.
5. Add administrative audit views, preferences, limits, and asynchronous data exports.

Exit gate:

- Metrics have documented definitions, jobs are recoverable/idempotent, rules cannot escape their tenant/project scope, and exports contain only authorized tenant data.

## 5. Testing strategy

### 5.1 Test pyramid and ownership

| Layer | Purpose | Examples | Runs |
| --- | --- | --- | --- |
| Static | Prevent basic defects and boundary violations | TypeScript strict checks, ESLint, formatting, dependency rules, generated contract diff | Every PR |
| Unit | Fast business-rule feedback | policies, rank generation, transitions, invitations, token logic, serializers | Local + every PR |
| Database integration | Validate real constraints and transactions | membership uniqueness, composite FKs, migrations, task moves, activity atomicity | Every PR with PostgreSQL |
| API/contract | Exercise HTTP, auth, validation, and OpenAPI | Supertest endpoints, error envelopes, access matrix, schema snapshot | Every PR |
| Component | Verify interactive UI behavior | forms, filters, board keyboard controls, conflicts | Every PR |
| End-to-end | Prove critical user journeys | registration, invite, project/task/board/comment journey | PR smoke; full on main/release |
| Non-functional | Security, accessibility, performance, resilience | dependency/container scan, axe, load smoke, reconnect/restore drills | Scheduled + release |

Use a real PostgreSQL instance for persistence and tenant-isolation integration tests. Do not substitute SQLite because PostgreSQL constraints, transactions, indexes, types, and locking behavior are part of the architecture.

### 5.2 Mandatory authorization test matrix

Every protected endpoint should cover at least:

1. unauthenticated user;
2. authenticated non-organization member;
3. member of a different organization using a valid foreign identifier;
4. organization member without project membership;
5. project member with insufficient role;
6. authorized role success;
7. archived/removed membership and stale session behavior.

Factories must create at least two organizations in the same test database. Tests should attempt both direct resource IDs and nested/related IDs to catch indirect object reference defects.

### 5.3 Data and migration testing

- Build the database from zero using committed migrations.
- Upgrade from a representative prior schema snapshot for release candidates.
- Validate seed scripts are idempotent or explicitly disposable and never run demo seed data against production accidentally.
- Test transaction rollback for invitation acceptance, project initialization, board moves, and activity creation.
- Load representative boards and activity histories to assert bounded query counts and pagination.

### 5.4 Quality targets

Coverage percentages are indicators, not acceptance criteria. Start with suggested gates of 80% line coverage for security-critical domain/application modules and 70% overall, then ratchet upward without rewarding trivial tests. No merge is allowed with failing critical journeys or untested tenant authorization changes.

## 6. CI/CD strategy

### 6.1 Pull-request workflow

GitHub Actions should:

1. install dependencies with `npm ci` from the committed lockfile;
2. verify formatting, linting, strict type checks, and monorepo dependency rules;
3. start an ephemeral PostgreSQL service and apply migrations;
4. run unit, integration, API/contract, and component tests;
5. generate OpenAPI/client artifacts and fail on an unexplained diff;
6. build production web/API images and run container smoke tests;
7. run dependency, secret, and container image scans;
8. upload test reports and relevant artifacts.

Native npm workspace commands are sufficient initially. A build cache can reduce runtime later, but security/tenant tests and production builds should run on all release candidates even when cache hits exist.

### 6.2 Main/release workflow

1. Build immutable images once and tag them with commit SHA; promote the same images between environments.
2. Generate a software bill of materials and retain scan results.
3. Deploy automatically to staging and run migration, readiness, and Playwright smoke checks.
4. Require an explicit production/demo environment approval initially.
5. Back up the database, run the compatible migration job once, deploy API then web/worker as appropriate, and verify health and critical synthetic journeys.
6. Roll back application images on failure. Use forward-compatible/expand-contract migrations; never assume a destructive schema rollback is safe.

### 6.3 Branch and release policy

- Keep pull requests small and aligned to a vertical slice.
- Require passing checks and at least one review when collaborators are available.
- Use conventional or repository-defined commit messages and automated release notes/tags once releases begin.
- Protect the default branch and production environment; do not expose production secrets to pull requests from forks.

## 7. Deployment strategy

### Local development

- Docker Compose provides PostgreSQL and development email; optional profiles add Redis and S3-compatible storage later.
- Developers may run web/API locally for fast reload while retaining containerized dependencies.
- Migrations and representative seed data are explicit commands.

### Staging and production/demo

- Deploy web and API as separate stateless container services behind TLS on same-site subdomains where possible.
- Use managed PostgreSQL with connection pooling, encrypted transport, automated backups, point-in-time recovery where available, and restricted network access.
- Store secrets in the platform secret manager; separate keys, databases, cookies, and object buckets per environment.
- Run migrations as a controlled release job. Run workers separately once advanced jobs exist.
- Use managed Redis and private S3-compatible storage only for their planned phases.
- Configure centralized logs, error tracking, uptime checks, latency/error dashboards, and backup alerts.

### Rollback and recovery

- Prefer backward-compatible database migrations: add/dual-read or dual-write/backfill/switch/remove across releases.
- Retain recent immutable images and deployment configuration.
- Document recovery time/recovery point expectations for the demo environment and rehearse a restore before MVP release.
- Application rollback never replaces a tested database restore procedure.

## 8. Risks, tradeoffs, and mitigations

| Risk | Impact | Mitigation / stop condition |
| --- | --- | --- |
| Scope expansion | Core release remains unfinished | Freeze advanced work until all MVP release gates pass. |
| Authorization complexity | Cross-tenant data exposure | Central policies, scoped repositories, composite constraints, mandatory negative matrix. |
| Client cache leakage | One user's data rendered to another | Disable/tag user-specific Next.js caching and test session/tenant switches. |
| Concurrent board edits | Lost updates or inconsistent rank | Transactions, optimistic versions, authoritative response, rank rebalance tests. |
| Premature real-time work | Distributed complexity masks data bugs | Begin Phase 7 only after persisted board workflows and activity are stable. |
| Migration failure | Deployment outage/data loss | Expand-contract migrations, staging rehearsal, backup/restore drill, one-shot migration job. |
| Solo-developer timeline | Reduced quality or abandoned project | Treat the MVP as the portfolio deliverable; cut advanced scope, not tests/security/docs. |
| Operational cost | Demo becomes unsustainable | Start with two app services and managed PostgreSQL; add Redis/object storage only when used. |

## 9. Decision checkpoints

Before implementation begins, confirm:

1. whether CI duration has grown enough to justify adding a dedicated workspace task cache/orchestrator;
2. access/refresh cookies versus opaque server sessions;
3. exact project-member permissions for task editing and archival;
4. organization/project slug and key rules;
5. date-only versus timestamp semantics for due dates;
6. deployment provider and same-site domain layout;
7. email provider for password reset/invitations;
8. chosen frontend unit test runner and drag-and-drop library.

Before Phase 2 advanced work, confirm:

1. Redis and BullMQ provider/operational budget;
2. notification retention and email notification scope;
3. attachment size/type/retention policy and object storage provider;
4. whether virus scanning is required for the intended deployment.

## 10. MVP demonstration script

The final MVP demo should show:

1. Register owner A and create organization A.
2. Invite and accept member A; create a project and assign project membership.
3. Create labels, a task, subtasks, due date, priority, and assignee.
4. Move the task through configurable workflow columns using the board.
5. Add/edit a comment and inspect persisted activity.
6. Refresh/restart and show that state is durable.
7. Sign in as a user from organization B and demonstrate denied direct-ID and UI access to organization A.
8. Show passing GitHub Actions checks, health endpoints, API documentation, and the deployed environment.
