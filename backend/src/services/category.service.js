const categoryRepo = require('../repositories/category.repository');
const { withTransaction } = require('../db/transaction');
const { ConflictError, ForbiddenError, NotFoundError } = require('../utils/errors');

function toCategory(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    is_default: row.is_default,
    created_at: row.created_at.toISOString(),
  };
}

async function getCategories(userId) {
  const rows = await categoryRepo.findAllByUserId(userId);
  return rows.map(toCategory);
}

async function createCategory(userId, name) {
  const existing = await categoryRepo.findByNameAndUserId(name, userId);
  if (existing) {
    throw new ConflictError(`'${name}' 카테고리가 이미 존재합니다`);
  }
  const row = await categoryRepo.create(userId, name);
  console.log(`[category] 생성 userId=${userId} name="${name}" id=${row.id}`);
  return toCategory(row);
}

async function deleteCategory(userId, categoryId) {
  const category = await categoryRepo.findById(categoryId);
  if (!category) {
    throw new NotFoundError('카테고리를 찾을 수 없습니다');
  }
  if (category.is_default) {
    throw new ForbiddenError('기본 카테고리는 삭제할 수 없습니다');
  }
  if (category.user_id !== userId) {
    throw new ForbiddenError('해당 카테고리를 삭제할 권한이 없습니다');
  }

  const defaultCategory = await categoryRepo.findDefaultByUserId(userId);
  if (!defaultCategory) {
    throw new NotFoundError('기본 카테고리를 찾을 수 없습니다');
  }

  await withTransaction(async (client) => {
    await categoryRepo.reassignTodos(client, categoryId, defaultCategory.id, userId);
    await categoryRepo.deleteById(client, categoryId);
  });
  console.log(`[category] 삭제 userId=${userId} categoryId=${categoryId}`);
}

module.exports = { getCategories, createCategory, deleteCategory };
