const { pool } = require('../db/pool');

async function deleteByUserId(client, userId) {
  await client.query('DELETE FROM categories WHERE user_id = $1', [userId]);
}

async function findAllByUserId(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM categories
     WHERE user_id = $1 OR (user_id IS NULL AND is_default = true)
     ORDER BY is_default DESC, name ASC`,
    [userId],
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
  return rows[0] ?? null;
}

async function findByNameAndUserId(name, userId) {
  const { rows } = await pool.query(
    'SELECT * FROM categories WHERE name = $1 AND user_id = $2',
    [name, userId],
  );
  return rows[0] ?? null;
}

async function create(userId, name) {
  const { rows } = await pool.query(
    `INSERT INTO categories (user_id, name) VALUES ($1, $2) RETURNING *`,
    [userId, name],
  );
  return rows[0];
}

async function findDefaultByUserId(_userId) {
  const { rows } = await pool.query(
    'SELECT * FROM categories WHERE is_default = true AND user_id IS NULL ORDER BY name ASC LIMIT 1',
  );
  return rows[0] ?? null;
}

async function deleteById(client, id) {
  await client.query('DELETE FROM categories WHERE id = $1', [id]);
}

async function reassignTodos(client, fromCategoryId, toCategoryId, userId) {
  await client.query(
    'UPDATE todos SET category_id = $1 WHERE category_id = $2 AND user_id = $3',
    [toCategoryId, fromCategoryId, userId],
  );
}

module.exports = {
  deleteByUserId,
  findAllByUserId,
  findById,
  findByNameAndUserId,
  create,
  findDefaultByUserId,
  deleteById,
  reassignTodos,
};
