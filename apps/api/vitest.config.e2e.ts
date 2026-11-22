import { defineConfig } from 'vitest/config';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://syncflow:syncflow@localhost:5432/syncflow_test?schema=public';
process.env.AUTH_ACCESS_SECRET ??= 'integration-test-access-secret-at-least-32-chars';
process.env.AUTH_REFRESH_SECRET ??=
  'integration-test-refresh-secret-at-least-32-chars';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    fileParallelism: false,
  },
});
