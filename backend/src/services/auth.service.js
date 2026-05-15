const userRepo = require('../repositories/user.repository');
const refreshTokenRepo = require('../repositories/refreshToken.repository');
const { hashPassword, comparePassword } = require('../utils/hash');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { hashToken } = require('../utils/tokenHash');
const { ConflictError, UnauthorizedError } = require('../utils/errors');

async function issueTokenPair(userId, email) {
  const payload = { sub: userId, email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await refreshTokenRepo.createToken({ userId, tokenHash, expiresAt });

  return { accessToken, refreshToken };
}

async function signup(input) {
  const existing = await userRepo.findByEmail(input.email);
  if (existing) {
    throw new ConflictError('이미 사용 중인 이메일입니다');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await userRepo.createUser({
    email: input.email,
    passwordHash,
    name: input.name,
  });

  const tokens = await issueTokenPair(user.id, user.email);
  console.log(`[auth] 회원가입 성공 userId=${user.id} email=${user.email}`);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

async function login(input) {
  const user = await userRepo.findByEmail(input.email);
  if (!user || !user.password_hash) {
    console.log(`[auth] 로그인 실패 — 사용자 없음 email=${input.email}`);
    throw new UnauthorizedError('이메일 또는 비밀번호가 올바르지 않습니다');
  }

  const passwordMatch = await comparePassword(input.password, user.password_hash);
  if (!passwordMatch) {
    console.log(`[auth] 로그인 실패 — 비밀번호 불일치 email=${input.email}`);
    throw new UnauthorizedError('이메일 또는 비밀번호가 올바르지 않습니다');
  }

  const tokens = await issueTokenPair(user.id, user.email);
  console.log(`[auth] 로그인 성공 userId=${user.id} email=${user.email}`);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

async function logout(refreshToken) {
  const tokenHash = hashToken(refreshToken);
  await refreshTokenRepo.deleteByTokenHash(tokenHash);
  console.log('[auth] 로그아웃');
}

async function refresh(refreshToken) {
  const tokenHash = hashToken(refreshToken);

  const tokenRecord = await refreshTokenRepo.findByTokenHash(tokenHash);
  if (!tokenRecord) {
    console.log('[auth] 토큰 갱신 실패 — 토큰 없음');
    throw new UnauthorizedError('유효하지 않은 리프레시 토큰입니다');
  }

  if (tokenRecord.expires_at < new Date()) {
    await refreshTokenRepo.deleteByTokenHash(tokenHash);
    console.log('[auth] 토큰 갱신 실패 — 토큰 만료');
    throw new UnauthorizedError('리프레시 토큰이 만료되었습니다');
  }

  const payload = verifyRefreshToken(refreshToken);

  await refreshTokenRepo.deleteByTokenHash(tokenHash);
  const newTokens = await issueTokenPair(payload.sub, payload.email);
  console.log(`[auth] 토큰 갱신 성공 userId=${payload.sub}`);

  return {
    accessToken: newTokens.accessToken,
    refreshToken: newTokens.refreshToken,
  };
}

module.exports = { signup, login, logout, refresh };
