const { Pool } = require('pg');
const { config } = require('../config/env');

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: config.DB_POOL_MAX,
  idleTimeoutMillis: config.DB_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: config.DB_CONNECTION_TIMEOUT_MS,
});

pool.on('error', (err) => {
  console.error('[pg pool] idle client error:', err.message);
});

async function closePool() {
  await pool.end();
}

module.exports = { pool, closePool };
