import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const testUrl =
  process.env.DATABASE_URL_TEST ??
  'postgresql://syncflow:syncflow@localhost:5432/syncflow_test?schema=public';
const parsedUrl = new URL(testUrl);
const databaseName = parsedUrl.pathname.slice(1);

if (!/^[a-z][a-z0-9_]*$/.test(databaseName)) {
  throw new Error('DATABASE_URL_TEST must use a simple PostgreSQL database name.');
}

const adminUrl = new URL(testUrl);
adminUrl.pathname = '/postgres';
adminUrl.search = '';

const client = new pg.Client({ connectionString: adminUrl.toString() });
await client.connect();
const existing = await client.query(
  'SELECT 1 FROM pg_database WHERE datname = $1',
  [databaseName],
);
if (existing.rowCount === 0) {
  await client.query(`CREATE DATABASE "${databaseName}"`);
}
await client.end();

const prismaCli = fileURLToPath(
  new URL('../../../node_modules/prisma/build/index.js', import.meta.url),
);
const migration = spawnSync(
  process.execPath,
  [prismaCli, 'migrate', 'deploy', '--config', 'prisma7.config.ts'],
  {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'inherit',
  },
);

if (migration.error) throw migration.error;
if (migration.status !== 0) {
  throw new Error('Failed to apply migrations to the integration-test database.');
}
