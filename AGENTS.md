
# SyncFlow Development Instructions

## Project
SyncFlow is a multi-tenant SaaS project and task
management platform.

## Technology Stack
- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: NestJS, TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Authentication: secure sessions or access/refresh tokens
- Real-time: Socket.IO
- Caching and queues: Redis, BullMQ (later phase)
- Testing: Jest, Supertest, Playwright
- DevOps: Docker, GitHub Actions

## Architecture
- Use a monorepo with apps/web and apps/api.
- Keep backend code modular.
- Separate controllers, services, DTOs, and guards.
- Use Prisma migrations for database changes.
- Keep business logic out of controllers.
- Use shared TypeScript types where appropriate.

## Development Rules
1. Read docs/requirements.md before implementing features.
2. Work on one feature or module at a time.
3. Explain the implementation plan before large changes.
4. Do not implement unrelated modules.
5. Validate all incoming API requests.
6. Enforce authorization on the backend.
7. Isolate organization data between tenants.
8. Use consistent error handling.
9. Never hardcode secrets or credentials.
10. Create tests for important business logic.
11. Run relevant tests after changes.
12. Report files changed and commands executed.
13. Do not remove existing working features.
14. Update relevant documentation when needed.

## Security
- Hash passwords securely.
- Use HTTP-only secure cookies when appropriate.
- Never expose credentials in source control.
- Check organization and project permissions.
- Apply rate limiting to sensitive endpoints.
- Validate file uploads.

## Development Workflow
- Plan
- Implement
- Test
- Explain changes
- Review
- Commit

## Important
Do not generate the entire application at once.
Follow the phases documented in docs/requirements.md.
