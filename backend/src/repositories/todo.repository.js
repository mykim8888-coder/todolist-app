const { pool } = require('../db/pool');

async function deleteByUserId(client, userId) {
  await client.query('DELETE FROM todos WHERE user_id = $1', [userId]);
}

async function findAll(userId, filter = {}) {
  const conditions = ['user_id = $1'];
  const values = [userId];
  let paramIdx = 2;

  if (filter.categoryId !== undefined) {
    conditions.push(`category_id = $${paramIdx++}`);
    values.push(filter.categoryId);
  }
  if (filter.isCompleted !== undefined) {
    conditions.push(`is_completed = $${paramIdx++}`);
    values.push(filter.isCompleted);
  }
  if (filter.overdue === true) {
    conditions.push(`due_date < CURRENT_DATE AND is_completed = false`);
  }

  const sql = `SELECT * FROM todos WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`;
  const { rows } = await pool.query(sql, values);
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM todos WHERE id = $1', [id]);
  return rows[0] ?? null;
}

async function create(data) {
  const { rows } = await pool.query(
    `INSERT INTO todos (user_id, category_id, title, description, start_date, due_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [data.userId, data.categoryId, data.title, data.description ?? null, data.startDate ?? null, data.dueDate ?? null],
  );
  return rows[0];
}

async function update(id, data) {
  const setClauses = [];
  const values = [];
  let paramIdx = 1;

  if (data.title !== undefined) { setClauses.push(`title = $${paramIdx++}`); values.push(data.title); }
  if (data.categoryId !== undefined) { setClauses.push(`category_id = $${paramIdx++}`); values.push(data.categoryId); }
  if (data.description !== undefined) { setClauses.push(`description = $${paramIdx++}`); values.push(data.description); }
  if (data.startDate !== undefined) { setClauses.push(`start_date = $${paramIdx++}`); values.push(data.startDate); }
  if (data.dueDate !== undefined) { setClauses.push(`due_date = $${paramIdx++}`); values.push(data.dueDate); }
  if (data.isCompleted !== undefined) { setClauses.push(`is_completed = $${paramIdx++}`); values.push(data.isCompleted); }

  if (setClauses.length === 0) return findById(id);

  values.push(id);
  const sql = `UPDATE todos SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`;
  const { rows } = await pool.query(sql, values);
  return rows[0] ?? null;
}

async function deleteById(id) {
  await pool.query('DELETE FROM todos WHERE id = $1', [id]);
}

async function reassignCategory(client, fromCategoryId, toCategoryId, userId) {
  await client.query(
    'UPDATE todos SET category_id = $1 WHERE category_id = $2 AND user_id = $3',
    [toCategoryId, fromCategoryId, userId],
  );
}

module.exports = {
  deleteByUserId,
  findAll,
  findById,
  create,
  update,
  deleteById,
  reassignCategory,
};
