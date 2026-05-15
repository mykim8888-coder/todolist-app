const { pool } = require('../db/pool');

async function createUser(data) {
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, name, auth_provider, provider_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.email, data.passwordHash, data.name, data.authProvider ?? 'local', data.providerId ?? null],
  );
  return rows[0];
}

async function findByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] ?? null;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ?? null;
}

async function updateUser(id, data) {
  const setClauses = [];
  const values = [];
  let paramIdx = 1;

  if (data.name !== undefined) {
    setClauses.push(`name = $${paramIdx++}`);
    values.push(data.name);
  }
  if (data.passwordHash !== undefined) {
    setClauses.push(`password_hash = $${paramIdx++}`);
    values.push(data.passwordHash);
  }

  if (setClauses.length === 0) {
    return findById(id);
  }

  values.push(id);
  const sql = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`;
  const { rows } = await pool.query(sql, values);
  return rows[0] ?? null;
}

async function deleteUser(client, id) {
  await client.query('DELETE FROM users WHERE id = $1', [id]);
}

module.exports = { createUser, findByEmail, findById, updateUser, deleteUser };
