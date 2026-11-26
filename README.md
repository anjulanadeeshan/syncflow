# SyncFlow

SyncFlow is a multi-tenant project and task management SaaS application. The repository contains a Next.js web app, NestJS API, Prisma/PostgreSQL persistence, authentication, and organization/invitation management. Project and task features are not implemented yet.

## Prerequisites

- Node.js `22.22.3+`, `24.15.0+`, or a newer supported release
- npm `10+`
- Docker Desktop or another Docker Engine with Compose v2

## Install and configure

From the repository root:

```powershell
npm install
Copy-Item .env.example .env
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/api/.env.example apps/api/.env
```

For anything beyond local development, replace all authentication and invitation secrets in `apps/api/.env` with different cryptographically random values of at least 32 characters.

## Start locally

Start PostgreSQL and the local Mailpit email catcher, then apply the committed migrations:

```powershell
npm run dev:services
npm run db:migrate
```

To run the local web and API applications against a hosted Supabase PostgreSQL
project instead, follow [the Supabase local testing guide](docs/supabase-local.md).

Start the frontend and API together:

```powershell
npm run dev
```

Open these URLs:

- Web application: <http://localhost:3000>
- Registration: <http://localhost:3000/register>
- Login: <http://localhost:3000/login>
- Organizations: <http://localhost:3000/organizations>
- API health: <http://localhost:3001/api/health>
- Invitation emails: <http://localhost:8025>

Run only one application when needed:

```powershell
npm run dev:web
npm run dev:api
```

Stop PostgreSQL without deleting its named volume:

```powershell
npm run db:down
```

## Validation

```powershell
npm run prisma:validate
npm run lint
npm test
npm run test:e2e
npm run build
```

End-to-end tests automatically create and migrate a separate `syncflow_test` database. They never clear the development database.

## Repository structure

```text
syncflow/
|-- apps/
|   |-- web/
|   |   |-- src/app/              # App Router pages and layouts
|   |   |-- src/components/auth/  # Responsive authentication UI
|   |   |-- src/components/organizations/ # Organization and invitation UI
|   |   `-- src/lib/              # Auth and organization API/state clients
|   `-- api/
|       |-- prisma/               # Schema and versioned migrations
|       |-- src/common/           # Shared HTTP error/cookie utilities
|       |-- src/config/           # Validated environment configuration
|       |-- src/infrastructure/   # Prisma database adapter/module
|       |-- src/modules/auth/     # Authentication vertical slice
|       |-- src/modules/organizations/ # Tenant membership and invitations
|       |-- src/modules/health/   # Health endpoint
|       `-- test/                 # Integration tests and test DB setup
|-- docs/                         # Product and architecture documentation
|-- docker-compose.yml            # Local PostgreSQL service
|-- package.json                  # npm workspaces and root commands
`-- package-lock.json             # Reproducible dependency lockfile
```

## Environment variables

| File | Variable | Purpose |
| --- | --- | --- |
| Root `.env` | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` | Docker PostgreSQL settings |
| `apps/api/.env` | `PORT`, `CORS_ORIGIN` | API port and credentialed browser origins |
| `apps/api/.env` | `DATABASE_URL`, `DATABASE_URL_TEST` | Development and isolated integration-test databases |
| `apps/api/.env` | `DATABASE_USE_LIBPQ_SSL_COMPAT` | Optional local TLS compatibility for the `pg` Prisma adapter |
| `apps/api/.env` | `DIRECT_URL` | Optional direct or session-mode migration connection; defaults to `DATABASE_URL` |
| `apps/api/.env` | `DATABASE_TRANSACTION_MAX_WAIT_MS`, `DATABASE_TRANSACTION_TIMEOUT_MS` | Prisma transaction limits, including hosted pooler cold starts |
| `apps/api/.env` | `AUTH_ACCESS_SECRET`, `AUTH_REFRESH_SECRET` | Separate access signing and refresh HMAC secrets |
| `apps/api/.env` | `ACCESS_TOKEN_TTL_MINUTES`, `SESSION_TTL_HOURS` | Session lifetime controls |
| `apps/api/.env` | `INVITATION_TOKEN_SECRET`, `INVITATION_TTL_HOURS` | Invitation token hashing and expiry |
| `apps/api/.env` | `MAIL_PROVIDER`, `SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM`, `WEB_URL` | Invitation delivery provider and acceptance link |
| `apps/api/.env` | `BREVO_API_KEY`, `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME` | Server-only Brevo transactional-email credentials and verified sender |
| `apps/api/.env` | `COOKIE_DOMAIN` | Optional production cookie domain; blank means host-only |
| `apps/web/.env.local` | `NEXT_PUBLIC_API_URL` | Browser-visible API base URL |

Real environment files are ignored by Git. Commit only `.env.example` templates. See `docs/authentication.md` for session security and `docs/organization-management.md` for tenant and invitation policy.

For Brevo transactional email configuration, see [docs/brevo-email.md](docs/brevo-email.md).
