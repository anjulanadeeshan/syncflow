# Authentication and session strategy

SyncFlow uses a short-lived access token plus a rotating, database-backed refresh session. This implements the architecture decision in `architecture.md` while allowing immediate logout and server-side session revocation.

## Credential and session lifecycle

1. Registration validates the request, normalizes the email, and hashes the password with Argon2id (`64 MiB` memory, `3` iterations, parallelism `1`).
2. Login performs a constant-work password check and returns the same error whether the email or password is wrong.
3. A successful registration or login creates a `Session` row and returns two HTTP-only cookies:
   - `syncflow_access`: a signed HS256 JWT with user ID, session ID, issuer, audience, and a 15-minute lifetime.
   - `syncflow_refresh`: an opaque 256-bit secret prefixed by its session UUID. Only an HMAC-SHA256 digest is stored in PostgreSQL. It expires after 7 days by default.
4. `POST /api/auth/refresh` verifies the session and rotates the refresh secret. Reuse of an old token revokes that session.
5. `POST /api/auth/logout` revokes the database session and removes all authentication cookies.
6. `GET /api/auth/me` verifies both the access token and the active database session before returning an explicit public user shape.

The TTL values are configurable through `ACCESS_TOKEN_TTL_MINUTES` and `SESSION_TTL_HOURS`. The access and refresh signing/HMAC secrets must be different and at least 32 characters. Production startup fails if either secret or `DATABASE_URL` is missing.

## Cookie policy

All cookies use `SameSite=Lax`. Authentication cookies are `HttpOnly`. In local development they omit `Secure` so `http://localhost` works; production automatically adds `Secure`. `COOKIE_DOMAIN` is optional and cookies remain host-only when it is empty.

The refresh cookie is scoped to `/api/auth`, limiting where the browser sends the long-lived credential. The access and CSRF cookies use `/` because authenticated API calls and browser CSRF handling need them there.

## CSRF protection

`GET /api/auth/csrf` returns a random token and sets the same value in the readable `syncflow_csrf` cookie. Every state-changing request must send that value in `X-CSRF-Token`. A global guard performs a timing-safe comparison. CORS also allows credentials only from configured `CORS_ORIGIN` values.

This double-submit strategy is suitable because the web and API are same-site in the supported deployment model. If the frontend and API later move to unrelated sites, cookie and CSRF policy must be revisited together.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/auth/csrf` | Issue or return the CSRF token |
| `POST` | `/api/auth/register` | Create a user and session |
| `POST` | `/api/auth/login` | Verify credentials and create a session; limited to 5 attempts/minute per client |
| `POST` | `/api/auth/refresh` | Rotate the refresh secret and issue a new access token |
| `POST` | `/api/auth/logout` | Revoke the current session and clear cookies |
| `GET` | `/api/auth/me` | Return the authenticated public user |

All errors use `{ statusCode, code, message, details?, timestamp, path }`. Password hashes and raw refresh tokens are never serialized in response bodies.

## Authorization boundary

The dashboard redirects unauthenticated users after the client checks the API session. This is a user-experience guard, not the security boundary. All protected data endpoints must use the backend session guard because users can call APIs without using the Next.js interface.

## Assumptions and tradeoffs

- Protected requests validate the database session as well as the JWT. This adds a database lookup, but enables immediate revocation and gives later tenant-aware authorization a reliable server-side boundary.
- Session records are retained after revocation for security analysis. A future scheduled retention job should remove expired/revoked records after the chosen audit window.
- Login throttling uses the client IP exposed to NestJS. A production reverse proxy must preserve the real client address and the API must be configured to trust only that proxy; otherwise many users may share one rate-limit bucket.
- The browser UI and API are expected to remain same-site. Cross-site hosting would require `SameSite=None; Secure` cookies and a reviewed CORS/CSRF design.
