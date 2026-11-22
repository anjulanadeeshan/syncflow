# SyncFlow

SyncFlow is a multi-tenant project and task management SaaS application. The repository contains a Next.js web app, NestJS API, Prisma/PostgreSQL persistence, and the authentication and user-management foundation. Organization, project, and task features are not implemented yet.

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

For anything beyond local development, replace both authentication secrets in `apps/api/.env` with different cryptographically random values of at least 32 characters.

## Start locally

Start PostgreSQL and apply the committed migration:

```powershell
npm run db:up
npm run db:migrate
```

Start the frontend and API together:

```powershell
npm run dev
```

Open these URLs:

- Web application: <http://localhost:3000>
- Registration: <http://localhost:3000/register>
- Login: <http://localhost:3000/login>
- API health: <http://localhost:3001/api/health>

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
|   |   `-- src/lib/auth/         # API client and authenticated state
|   `-- api/
|       |-- prisma/               # Schema and versioned migrations
|       |-- src/common/           # Shared HTTP error/cookie utilities
|       |-- src/config/           # Validated environment configuration
|       |-- src/infrastructure/   # Prisma database adapter/module
|       |-- src/modules/auth/     # Authentication vertical slice
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
| `apps/api/.env` | `AUTH_ACCESS_SECRET`, `AUTH_REFRESH_SECRET` | Separate access signing and refresh HMAC secrets |
| `apps/api/.env` | `ACCESS_TOKEN_TTL_MINUTES`, `SESSION_TTL_HOURS` | Session lifetime controls |
| `apps/api/.env` | `COOKIE_DOMAIN` | Optional production cookie domain; blank means host-only |
| `apps/web/.env.local` | `NEXT_PUBLIC_API_URL` | Browser-visible API base URL |

Real environment files are ignored by Git. Commit only `.env.example` templates. See `docs/authentication.md` for the complete session, cookie, CSRF, and authorization strategy.
