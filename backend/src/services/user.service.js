const userRepo = require('../repositories/user.repository');
const refreshTokenRepo = require('../repositories/refreshToken.repository');
const todoRepo = require('../repositories/todo.repository');
const categoryRepo = require('../repositories/category.repository');
const { hashPassword, comparePassword } = require('../utils/hash');
const { withTransaction } = require('../db/transaction');
const { UnauthorizedError, NotFoundError } = require('../utils/errors');

function toUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    auth_provider: row.auth_provider,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

async function getMe(userId) {
  const user = await userRepo.findById(userId);
  if (!user) throw new NotFoundError('사용자를 찾을 수 없습니다');
  return toUser(user);
}

async function updateMe(userId, data) {
  const updateData = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
  }

  if (data.newPassword !== undefined) {
    if (!data.currentPassword) {
      throw new UnauthorizedError('현재 비밀번호를 입력해주세요');
    }
    const user = await userRepo.findById(userId);
    if (!user || !user.password_hash) {
      throw new UnauthorizedError('비밀번호를 변경할 수 없는 계정입니다');
    }
    const isMatch = await comparePassword(data.currentPassword, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('현재 비밀번호가 올바르지 않습니다');
    }
    updateData.passwordHash = await hashPassword(data.newPassword);
  }

  const updated = await userRepo.updateUser(userId, updateData);
  if (!updated) throw new NotFoundError('사용자를 찾을 수 없습니다');
  console.log(`[user] 정보 수정 userId=${userId}`);
  return toUser(updated);
}

async function deleteMe(userId, password) {
  const user = await userRepo.findById(userId);
  if (!user) throw new NotFoundError('사용자를 찾을 수 없습니다');
  if (!user.password_hash) throw new UnauthorizedError('비밀번호를 확인할 수 없는 계정입니다');

  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) throw new UnauthorizedError('비밀번호가 올바르지 않습니다');

  await withTransaction(async (client) => {
    await refreshTokenRepo.deleteByUserId(client, userId);
    await todoRepo.deleteByUserId(client, userId);
    await categoryRepo.deleteByUserId(client, userId);
    await userRepo.deleteUser(client, userId);
  });
  console.log(`[user] 회원탈퇴 완료 userId=${userId}`);
}

module.exports = { getMe, updateMe, deleteMe };
