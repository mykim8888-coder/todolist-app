import { Pool, PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { runMigrations } from '../../src/db/utils';

const TEST_DB_NAME = 'todolist_test';

let testPool: Pool | null = null;

export function getTestPool(): Pool {
  const connectionString = process.env.DATABASE_URL ?? '';
  if (!connectionString.includes(TEST_DB_NAME)) {
    throw new Error(
      `[dbSetup] getTestPool() 호출 거부: DATABASE_URL이 ${TEST_DB_NAME}를 가리키지 않습니다. (현재: ${connectionString})`,
    );
  }
  if (!testPool) {
    testPool = new Pool({ connectionString, max: 5 });
  }
  return testPool;
}

export async function initTestDatabase(): Promise<void> {
  const pool = getTestPool();
  const client = await pool.connect();
  try {
    // schema_migrations 테이블 생성 (멱등)
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // users 테이블 존재 여부 확인
    const { rows: tableRows } = await client.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) AS exists
    `);

    if (tableRows[0].exists) {
      // 이미 테이블이 있는 경우 - migration 파일만 applied로 표시
      const migrationsDir = path.join(__dirname, '../../src/db/migrations');
      const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();
      for (const file of files) {
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
          [file],
        );
      }
    } else {
      // 새 DB - 마이그레이션 실행
      await runMigrations();
    }
  } finally {
    client.release();
  }
}

export async function clearAllTables(): Promise<void> {
  const pool = getTestPool();
  const client: PoolClient = await pool.connect();
  try {
    // FK 순서 고려: todos → user 소유 categories → refresh_tokens → users
    await client.query('DELETE FROM todos');
    await client.query('DELETE FROM categories WHERE user_id IS NOT NULL');
    await client.query('DELETE FROM refresh_tokens');
    await client.query('DELETE FROM users');
  } finally {
    client.release();
  }
}

interface SeedUserOverrides {
  email?: string;
  password_hash?: string;
  name?: string;
  auth_provider?: string;
}

export async function seedTestUser(overrides: SeedUserOverrides = {}): Promise<string> {
  const pool = getTestPool();
  const client: PoolClient = await pool.connect();
  try {
    const email = overrides.email ?? `test_${Date.now()}@example.com`;
    const password_hash = overrides.password_hash ?? '$2b$04$test_hash_placeholder';
    const name = overrides.name ?? 'Test User';
    const auth_provider = overrides.auth_provider ?? 'local';

    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, name, auth_provider)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [email, password_hash, name, auth_provider],
    );
    return rows[0].id;
  } finally {
    client.release();
  }
}

export async function closeTestPool(): Promise<void> {
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
}
