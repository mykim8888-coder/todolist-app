const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

async function checkDatabaseConnection() {
  const client = await pool.connect().catch(() => null);
  if (!client) return false;
  try {
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    client.release();
  }
}

async function getDatabaseStatus() {
  const client = await pool.connect().catch(() => null);
  if (!client) {
    return {
      connected: false,
      latencyMs: -1,
      poolTotal: pool.totalCount,
      poolIdle: pool.idleCount,
      poolWaiting: pool.waitingCount,
    };
  }
  try {
    const start = Date.now();
    await client.query('SELECT 1');
    return {
      connected: true,
      latencyMs: Date.now() - start,
      poolTotal: pool.totalCount,
      poolIdle: pool.idleCount,
      poolWaiting: pool.waitingCount,
    };
  } catch {
    return {
      connected: false,
      latencyMs: -1,
      poolTotal: pool.totalCount,
      poolIdle: pool.idleCount,
      poolWaiting: pool.waitingCount,
    };
  } finally {
    client.release();
  }
}

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query(
      'SELECT filename FROM schema_migrations ORDER BY filename',
    );
    const applied = new Set(rows.map((r) => r.filename));

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[migrate] skip: ${file}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      console.log(`[migrate] applied: ${file}`);
    }
  } finally {
    client.release();
  }
}

module.exports = { checkDatabaseConnection, getDatabaseStatus, runMigrations };
