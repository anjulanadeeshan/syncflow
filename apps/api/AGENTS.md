# NestJS application guidance

This application uses NestJS 12 with ESM, NodeNext module resolution, and Vitest.

- Read the versioned NestJS documentation at <https://docs.nestjs.com/llms.txt> when framework behavior is uncertain.
- Relative TypeScript imports end in `.js` because the emitted application is ESM.
- Unit tests sit beside source files as `*.spec.ts`; end-to-end tests live in `test/`.
- Keep controllers thin and place future business workflows in feature modules.
- Do not add authentication or SyncFlow business modules until their planned phase.
- Prisma configuration belongs in `prisma7.config.ts`; generated client code is not committed.
