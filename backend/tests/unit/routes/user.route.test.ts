/**
 * BE-07 완료 조건 검증: user 라우터 + 컨트롤러 (HTTP 레벨)
 * - GET /api/users/me: password_hash 없음, authenticate 필요
 * - PATCH /api/users/me: 현재 비밀번호 불일치 시 401
 * - DELETE /api/users/me: 성공 시 200, 비밀번호 불일치 시 401
 * - authenticate 없이 접근 시 401
 */

jest.mock('../../../src/services/user.service');
jest.mock('../../../src/config/env', () => ({
  config: {
    CORS_ORIGIN: 'http://localhost:5173',
    NODE_ENV: 'test',
    PORT: 3000,
    DATABASE_URL: 'postgresql://test:test@localhost/test',
    JWT_ACCESS_SECRET: 'test-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    BCRYPT_SALT_ROUNDS: 4,
    DB_POOL_MAX: 5,
    DB_IDLE_TIMEOUT_MS: 30000,
    DB_CONNECTION_TIMEOUT_MS: 5000,
  },
}));
jest.mock('../../../src/utils/jwt');

import express from 'express';
import request from 'supertest';
import * as userService from '../../../src/services/user.service';
import * as jwtUtils from '../../../src/utils/jwt';
import { authenticate } from '../../../src/middleware/authenticate';
import { validate } from '../../../src/middleware/validate';
import { errorHandler } from '../../../src/middleware/errorHandler';
import * as userController from '../../../src/controllers/user.controller';
import { UnauthorizedError, NotFoundError } from '../../../src/utils/errors';
import { z } from 'zod';

const mockGetMe = userService.getMe as jest.Mock;
const mockUpdateMe = userService.updateMe as jest.Mock;
const mockDeleteMe = userService.deleteMe as jest.Mock;
const mockVerifyAccessToken = jwtUtils.verifyAccessToken as jest.Mock;

const FAKE_USER = {
  id: 'user-uuid-123',
  email: 'test@example.com',
  name: '홍길동',
  authProvider: 'local' as const,
  providerId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const FAKE_JWT_PAYLOAD = { sub: 'user-uuid-123', email: 'test@example.com' };
const VALID_TOKEN = 'valid-access-token';

function buildApp() {
  const app = express();
  app.use(express.json());

  const updateMeSchema = z
    .object({
      name: z.string().min(1).max(100).optional(),
      currentPassword: z.string().min(1).optional(),
      newPassword: z
        .string()
        .min(8)
        .regex(/^(?=.*[A-Za-z])(?=.*\d)/)
        .optional(),
    })
    .refine((d) => d.name !== undefined || d.newPassword !== undefined, {
      message: '수정할 항목을 입력해주세요',
    });

  const deleteMeSchema = z.object({
    password: z.string().min(1),
  });

  app.get('/api/users/me', authenticate, userController.getMe);
  app.patch('/api/users/me', authenticate, validate(updateMeSchema), userController.updateMe);
  app.delete('/api/users/me', authenticate, validate(deleteMeSchema), userController.deleteMe);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockVerifyAccessToken.mockReturnValue(FAKE_JWT_PAYLOAD);
});

describe('BE-07: GET /api/users/me', () => {
  it('유효한 토큰으로 조회 시 200과 user 정보를 반환한다', async () => {
    mockGetMe.mockResolvedValue(FAKE_USER);
    const app = buildApp();

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(FAKE_USER.id);
  });

  it('응답 바디에 password_hash 필드가 없다', async () => {
    mockGetMe.mockResolvedValue(FAKE_USER);
    const app = buildApp();

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.body.data.user).not.toHaveProperty('password_hash');
  });

  it('Authorization 헤더 없이 접근 시 401을 반환한다', async () => {
    const app = buildApp();

    const res = await request(app).get('/api/users/me');

    expect(res.status).toBe(401);
  });

  it('유효하지 않은 토큰으로 접근 시 401을 반환한다', async () => {
    mockVerifyAccessToken.mockImplementation(() => {
      throw new UnauthorizedError('유효하지 않은 토큰');
    });
    const app = buildApp();

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
  });

  it('사용자가 존재하지 않으면 404를 반환한다', async () => {
    mockGetMe.mockRejectedValue(new NotFoundError('사용자를 찾을 수 없습니다'));
    const app = buildApp();

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(404);
  });
});

describe('BE-07: PATCH /api/users/me', () => {
  it('이름 변경 성공 시 200과 업데이트된 user를 반환한다', async () => {
    mockUpdateMe.mockResolvedValue({ ...FAKE_USER, name: '새이름' });
    const app = buildApp();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ name: '새이름' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('새이름');
  });

  it('현재 비밀번호 불일치 시 401을 반환한다', async () => {
    mockUpdateMe.mockRejectedValue(new UnauthorizedError('현재 비밀번호가 올바르지 않습니다'));
    const app = buildApp();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ currentPassword: 'WrongPw1', newPassword: 'NewPass1' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('name도 newPassword도 없는 요청 시 422를 반환한다', async () => {
    const app = buildApp();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ currentPassword: 'Password1' });

    expect(res.status).toBe(422);
  });

  it('8자 미만 newPassword 시 422를 반환한다', async () => {
    const app = buildApp();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ newPassword: 'Sh1' });

    expect(res.status).toBe(422);
  });

  it('Authorization 없이 접근 시 401을 반환한다', async () => {
    const app = buildApp();

    const res = await request(app)
      .patch('/api/users/me')
      .send({ name: '새이름' });

    expect(res.status).toBe(401);
  });
});

describe('BE-07: DELETE /api/users/me', () => {
  it('올바른 비밀번호로 탈퇴 시 200을 반환한다', async () => {
    mockDeleteMe.mockResolvedValue(undefined);
    const app = buildApp();

    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ password: 'Password1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('비밀번호 불일치 시 401을 반환한다', async () => {
    mockDeleteMe.mockRejectedValue(new UnauthorizedError('비밀번호가 올바르지 않습니다'));
    const app = buildApp();

    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ password: 'WrongPw1' });

    expect(res.status).toBe(401);
  });

  it('password 필드 없이 요청 시 422를 반환한다', async () => {
    const app = buildApp();

    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({});

    expect(res.status).toBe(422);
  });

  it('Authorization 없이 접근 시 401을 반환한다', async () => {
    const app = buildApp();

    const res = await request(app)
      .delete('/api/users/me')
      .send({ password: 'Password1' });

    expect(res.status).toBe(401);
  });

  it('deleteMe 서비스가 올바른 userId와 password로 호출된다', async () => {
    mockDeleteMe.mockResolvedValue(undefined);
    const app = buildApp();

    await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ password: 'Password1' });

    expect(mockDeleteMe).toHaveBeenCalledWith('user-uuid-123', 'Password1');
  });
});
