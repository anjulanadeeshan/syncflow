# Organization management and invitations

This module implements requirements `ORG-01` through `ORG-06`. Organizations are tenant boundaries; every resource lookup validates the authenticated user's membership on the server before returning private data.

## Roles and permissions

| Operation | Owner | Admin | Member |
| --- | --- | --- | --- |
| View organization and members | Yes | Yes | Yes |
| Update name or slug | Yes | No | No |
| Invite a member | Yes | Yes | No |
| Invite an admin or owner | Yes | No | No |
| List or cancel manageable invitations | Yes | Yes | No |
| Change member roles | Yes | No | No |
| Remove a member | Yes | Members only | No |

Non-members receive a non-disclosing `404` for organization IDs. The API does not rely on the selected organization stored by the frontend.

## Invitation lifecycle

Invitations are addressed to a normalized email and contain an intended role. The email link carries a 256-bit token in the URL fragment, so browsers do not send the raw secret to the Next.js server. The frontend submits it directly to the API. PostgreSQL stores only an HMAC-SHA256 digest.

An invitation has exactly one active key per organization/email. Acceptance requires an authenticated account with the same normalized email. Acceptance consumes the invitation and creates the membership in one transaction. Rejection, cancellation, acceptance, and expiry clear the active key, so the token cannot be reused and a future invitation can be issued.

Invitation email is delivered through SMTP. Local development uses Mailpit at `http://localhost:8025`; tests use an in-memory delivery adapter and never make network calls. If SMTP delivery fails, the newly created invitation is cancelled so an undelivered active token does not block a retry.

## Consistency safeguards

- Organization creation and owner membership are atomic.
- Membership uniqueness is enforced by the composite primary key `(organizationId, userId)`.
- Active invitation uniqueness is enforced by a nullable unique key.
- Last-owner removal and demotion use serializable transactions.
- Invitation creation rechecks manager permission inside its transaction.
- Membership and invitation mutations scope every write by organization ID.

## API routes

| Method | Route | Permission |
| --- | --- | --- |
| `POST` | `/api/organizations` | Authenticated |
| `GET` | `/api/organizations` | Authenticated; returns memberships only |
| `GET` | `/api/organizations/:id` | Organization member |
| `PATCH` | `/api/organizations/:id` | Owner |
| `GET` | `/api/organizations/:id/members` | Organization member |
| `PATCH` | `/api/organizations/:id/members/:userId` | Owner |
| `DELETE` | `/api/organizations/:id/members/:userId` | Owner, or admin for members |
| `POST` | `/api/organizations/:id/invitations` | Owner/admin with role restrictions |
| `GET` | `/api/organizations/:id/invitations` | Owner/admin |
| `DELETE` | `/api/organizations/:id/invitations/:invitationId` | Owner/admin with role restrictions |
| `GET` | `/api/invitations/:token` | Authenticated invited email |
| `POST` | `/api/invitations/:token/accept` | Authenticated invited email |
| `POST` | `/api/invitations/:token/reject` | Authenticated invited email |

All state-changing routes also require the existing CSRF token/header pair.
