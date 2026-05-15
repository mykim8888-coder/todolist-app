const { pool } = require('../db/pool');

async function createToken(data) {
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [data.userId, data.tokenHash, data.expiresAt],
  );
}

async function findByTokenHash(tokenHash) {
  const { rows } = await pool.query(
    'SELECT * FROM refresh_tokens WHERE token_hash = $1',
    [tokenHash],
  );
  return rows[0] ?? null;
}

async function deleteByTokenHash(tokenHash) {
  await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
}

async function deleteByUserId(client, userId) {
  await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}

async function deleteExpiredTokens() {
  const { rowCount } = await pool.query(
    'DELETE FROM refresh_tokens WHERE expires_at < now()',
  );
  return rowCount ?? 0;
}

module.exports = {
  createToken,
  findByTokenHash,
  deleteByTokenHash,
  deleteByUserId,
  deleteExpiredTokens,
};
