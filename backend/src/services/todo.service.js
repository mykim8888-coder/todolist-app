const todoRepo = require('../repositories/todo.repository');
const categoryRepo = require('../repositories/category.repository');
const { ForbiddenError, NotFoundError, ValidationError } = require('../utils/errors');

function toTodo(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    category_id: row.category_id,
    title: row.title,
    description: row.description,
    start_date: row.start_date,
    due_date: row.due_date,
    is_completed: row.is_completed,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

function validateDates(startDate, dueDate) {
  if (startDate && dueDate && dueDate < startDate) {
    throw new ValidationError('종료예정일은 시작일 이후여야 합니다', [
      { field: 'dueDate', message: '종료예정일은 시작일 이후여야 합니다' },
    ]);
  }
}

async function validateCategoryAccess(categoryId, userId) {
  const category = await categoryRepo.findById(categoryId);
  if (!category) {
    throw new NotFoundError('카테고리를 찾을 수 없습니다');
  }
  if (!category.is_default && category.user_id !== userId) {
    throw new ForbiddenError('해당 카테고리를 사용할 권한이 없습니다');
  }
}

async function getTodos(userId, filter) {
  const rows = await todoRepo.findAll(userId, filter);
  return rows.map(toTodo);
}

async function getTodo(userId, todoId) {
  const todo = await todoRepo.findById(todoId);
  if (!todo) throw new NotFoundError('할일을 찾을 수 없습니다');
  if (todo.user_id !== userId) throw new ForbiddenError('해당 할일에 접근할 권한이 없습니다');
  return toTodo(todo);
}

async function createTodo(userId, data) {
  await validateCategoryAccess(data.categoryId, userId);
  validateDates(data.start_date, data.due_date);
  const row = await todoRepo.create({
    userId,
    categoryId: data.categoryId,
    title: data.title,
    description: data.description,
    startDate: data.start_date,
    dueDate: data.due_date,
  });
  console.log(`[todo] 생성 userId=${userId} todoId=${row.id} title="${data.title}"`);
  return toTodo(row);
}

async function updateTodo(userId, todoId, data) {
  const existing = await todoRepo.findById(todoId);
  if (!existing) throw new NotFoundError('할일을 찾을 수 없습니다');
  if (existing.user_id !== userId) throw new ForbiddenError('해당 할일을 수정할 권한이 없습니다');

  if (data.categoryId !== undefined) {
    await validateCategoryAccess(data.categoryId, userId);
  }

  const effectiveStart = data.start_date !== undefined ? data.start_date : existing.start_date;
  const effectiveDue = data.due_date !== undefined ? data.due_date : existing.due_date;
  validateDates(effectiveStart, effectiveDue);

  const updated = await todoRepo.update(todoId, {
    title: data.title,
    categoryId: data.categoryId,
    description: data.description,
    startDate: data.start_date,
    dueDate: data.due_date,
    isCompleted: data.is_completed,
  });
  if (!updated) throw new NotFoundError('할일을 찾을 수 없습니다');
  console.log(`[todo] 수정 userId=${userId} todoId=${todoId}`);
  return toTodo(updated);
}

async function deleteTodo(userId, todoId) {
  const existing = await todoRepo.findById(todoId);
  if (!existing) throw new NotFoundError('할일을 찾을 수 없습니다');
  if (existing.user_id !== userId) throw new ForbiddenError('해당 할일을 삭제할 권한이 없습니다');
  await todoRepo.deleteById(todoId);
  console.log(`[todo] 삭제 userId=${userId} todoId=${todoId}`);
}

module.exports = { getTodos, getTodo, createTodo, updateTodo, deleteTodo };
