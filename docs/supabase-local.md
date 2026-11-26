# Testing SyncFlow locally with Supabase PostgreSQL

## Scope

This setup keeps the Next.js and NestJS applications running on the local
machine while using a hosted Supabase PostgreSQL database. Supabase replaces
only the development database for this workflow. SyncFlow continues to use
Prisma, NestJS authentication, HTTP-only cookies, and application-level tenant
authorization.

Do not add Supabase browser keys to the web application. The browser must keep
accessing data through the NestJS API.

## 1. Create an isolated Supabase project

Create a Supabase project intended for development or staging, choose a region
near the machine or API host, and store its database password in a password
manager. Do not point local experiments at a production database.

## 2. Copy the connection strings

In the Supabase dashboard, select **Connect**. For a locally running,
long-lived NestJS API, copy the **Session pooler** connection string ending in
port `5432` and use `sslmode=require`. When the local machine does not trust the
certificate chain presented on the connection, enable SyncFlow's explicit
libpq compatibility option below. The connection remains encrypted.

Use the session pooler when the local network does not support the direct IPv6
endpoint. If direct IPv6 connectivity works, the direct URL can be used for
migrations.

Do not use the transaction pooler on port `6543` for Prisma migrations or the
current task transaction workflows.

## 3. Configure the untracked API environment

Edit `apps/api/.env`. Keep all existing authentication, invitation, CORS, and
Mailpit values, then replace only the database values:

```env
# NestJS/Prisma runtime connection (Supabase Session pooler, port 5432)
DATABASE_URL=postgresql://USER:PASSWORD@SESSION_POOLER_HOST:5432/postgres?sslmode=require
DATABASE_USE_LIBPQ_SSL_COMPAT=true

# Optional migration connection. Use the direct URL when reachable, otherwise
# the same Session pooler URL is suitable for local testing.
DIRECT_URL=postgresql://USER:PASSWORD@MIGRATION_HOST:5432/postgres?sslmode=require

# E2E tests deliberately remain on local Docker PostgreSQL.
DATABASE_URL_TEST=postgresql://syncflow:syncflow@localhost:5432/syncflow_test?schema=public

# Give a hosted pooler enough time to lease a cold transaction connection.
DATABASE_TRANSACTION_MAX_WAIT_MS=15000
DATABASE_TRANSACTION_TIMEOUT_MS=15000
```

Copy the complete URLs from Supabase rather than constructing their usernames
or hosts manually. Percent-encode reserved characters in the database password.
`DATABASE_USE_LIBPQ_SSL_COMPAT` affects only the Node PostgreSQL runtime
adapter; Prisma migrations continue to use `DIRECT_URL` unchanged.

## 4. Verify and migrate

From the repository root:

```powershell
npm run prisma:validate
npm run db:status
npm run db:migrate:deploy
npm run db:status
```

`db:migrate:deploy` applies only committed migrations and is the correct way to
initialize the remote development database. Use `db:migrate` only while
authoring a new migration against a disposable development database.

## 5. Start local services

PostgreSQL does not need to run locally for the application itself. Mailpit can
still capture invitation emails:

```powershell
npm run mail:up
npm run dev
```

Open the application at `http://localhost:3000`, the API health endpoint at
`http://localhost:3001/api/health`, and Mailpit at `http://localhost:8025`.

## 6. Run tests safely

The E2E suite uses `DATABASE_URL_TEST`, creates `syncflow_test` in local Docker
PostgreSQL, and overrides both Prisma connection variables before migrating.
Start local PostgreSQL before running it:

```powershell
npm run db:up
npm run test:e2e
```

This separation prevents test cleanup and migrations from touching Supabase.

## Switching back to local PostgreSQL

Restore these values in `apps/api/.env`:

```env
DATABASE_URL=postgresql://syncflow:syncflow@localhost:5432/syncflow?schema=public
DIRECT_URL=
```

Then start the local services and API normally:

```powershell
npm run dev:services
npm run db:migrate
npm run dev
```

## Security notes

- Never commit the database password or connection string.
- Never expose `DATABASE_URL` through a `NEXT_PUBLIC_` variable.
- Use a separate Supabase project for production.
- Require SSL and enable backups before storing important data.
- For production certificate verification, configure a trusted CA and use
  `sslmode=verify-full` with `DATABASE_USE_LIBPQ_SSL_COMPAT=false` instead of
  the local compatibility setting.
- Run production migrations through a controlled release step.
