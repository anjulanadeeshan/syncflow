# SyncFlow Authorization Model

## Purpose

SyncFlow uses resource-scoped, server-side authorization. Authentication proves the current user and session; authorization then resolves current database memberships and checks the exact permission required by the requested resource action.

Frontend permission checks improve usability only. They do not grant access and are never trusted by the API.

## Request authorization pipeline

```text
Request
  -> SessionAuthGuard authenticates the current session
  -> OrganizationPermissionGuard reads the route permission
  -> OrganizationAccessService reloads the user's current membership
  -> PermissionService evaluates the role-to-permission mapping
  -> DTO validation and controller execution
  -> service transaction rechecks membership for sensitive mutations
  -> tenant-filtered database query or mutation
```

Membership roles are not stored in access-token claims. Each organization-scoped request queries the current membership, so role changes and removals take effect immediately without waiting for token expiration.

## Organization roles and permissions

| Permission | Owner | Admin | Member |
| --- | ---: | ---: | ---: |
| Read organization | Yes | Yes | Yes |
| Read members | Yes | Yes | Yes |
| Update organization settings | Yes | No | No |
| Invite members | Yes | Yes | No |
| Read/cancel invitations | Yes | Yes | No |
| Remove members | Yes | Members only | No |
| Assign organization roles | Yes | No | No |
| Choose invite role | Any role | Member only | No |
| Create projects when introduced | Yes | Yes | No |

Additional invariants apply after the permission check:

- An administrator cannot invite, remove, promote, or otherwise manage an owner or another administrator.
- Only an owner can grant or revoke owner/admin roles.
- The final owner cannot be removed or demoted.
- Organization membership and role checks are repeated inside serializable transactions for sensitive membership changes.

## Project access policy

Project authorization is deliberately separate from organization authorization. Projects use explicit `PROJECT_MANAGER` and `MEMBER` memberships; organization ownership or administration alone does not grant access to project content.

Project access requires both:

1. a current organization membership for the project's organization; and
2. a current membership in the specific project.

An organization owner or administrator does not automatically receive access to every project. `PROJECT_MANAGER` can manage project settings, membership, workflow, tasks, and comments. A project `MEMBER` can read the project, work with ordinary tasks, and comment. Project modules must resolve both memberships from the database before using the project policy.

The project and task modules use `ProjectAccessService` and `ProjectPermissionGuard` to perform this resolution for every project-scoped route. Sensitive project, membership, and task mutations repeat the project membership and permission lookup inside their database transaction.

Project creation is restricted to organization owners and administrators. The creator becomes the first project manager, and the project, manager membership, and default workflow columns are created atomically. Project managers may update settings, archive the project, and manage membership. The final project manager cannot be removed or demoted, and archived projects are read-only.

## Tenant isolation

- Organization routes never trust a frontend-selected organization identifier.
- Membership lookup uses the composite `(organizationId, userId)` key.
- Tenant-owned list and mutation queries include `organizationId` in their filters.
- Target members and invitations are resolved inside the already-authorized organization scope.
- Cross-organization resource identifiers receive a non-disclosing `404` rather than revealing resource existence.

## Response policy

| Status | Meaning |
| --- | --- |
| `401 Unauthorized` | No valid authenticated session. |
| `403 Forbidden` | The resource is visible to the user, but their current role lacks the requested action permission. |
| `404 Not Found` | No current membership exists, or a nested resource is not present inside the authorized tenant scope. This avoids cross-tenant disclosure. |
| `409 Conflict` | A protected invariant or concurrent membership transition prevents the operation, including final-owner protection. |

## Frontend behavior

The web application mirrors organization and project permissions to hide or disable unavailable controls and provides a reusable access-denied view. API errors remain authoritative: the client still handles `403` responses because permissions may change after the page is rendered.

When a membership is revoked, the organization selector is refreshed after local mutations. Regardless of client state, the next API request re-resolves membership and denies access immediately.

## Extension rules

When adding a new organization or project operation:

1. Define a named permission in the centralized permission catalog.
2. Add it only to roles that require it under least privilege.
3. Declare the permission on the route guard.
4. Recheck it inside a transaction if authority and protected state can change together.
5. Require organization/project scope in every data-access query.
6. Add positive role tests and negative direct-API and cross-tenant tests.
