/**
 * BE-08 완료 조건 검증: category 라우터 + 컨트롤러 (HTTP 레벨)
 * - GET /api/categories: 목록 반환, authenticate 필요
 * - POST /api/categories: 201 생성, 중복 시 409
 * - DELETE /api/categories/:id: 성공 200, 기본 카테고리 403, 소유권 403
 */

jest.mock('../../../src/services/category.service');
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
import * as categoryService from '../../../src/services/category.service';
import * as jwtUtils from '../../../src/utils/jwt';
import { authenticate } from '../../../src/middleware/authenticate';
import { validate } from '../../../src/middleware/validate';
import { errorHandler } from '../../../src/middleware/errorHandler';
import * as categoryController from '../../../src/controllers/category.controller';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../src/utils/errors';
import { z } from 'zod';

const mockGetCategories = categoryService.getCategories as jest.Mock;
const mockCreateCategory = categoryService.createCategory as jest.Mock;
const mockDeleteCategory = categoryService.deleteCategory as jest.Mock;
const mockVerifyAccessToken = jwtUtils.verifyAccessToken as jest.Mock;

const FAKE_JWT_PAYLOAD = { sub: 'user-uuid-123', email: 'test@example.com' };
const VALID_TOKEN = 'valid-access-token';

const FAKE_DEFAULT_CATEGORY = {
  id: 'default-cat-id',
  userId: null,
  name: '일반',
  isDefault: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const FAKE_USER_CATEGORY = {
  id: 'user-cat-id',
  userId: 'user-uuid-123',
  name: '내 카테고리',
  isDefault: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

function buildApp() {
  const app = express();
  app.use(express.json());

  const createSchema = z.object({
    name: z.string().min(1).max(100),
  });

  app.get('/api/categories', authenticate, categoryController.getCategories);
  app.post('/api/categories', authenticate, validate(createSchema), categoryController.createCategory);
  app.delete('/api/categories/:id', authenticate, categoryController.deleteCategory);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockVerifyAccessToken.mockReturnValue(FAKE_JWT_PAYLOAD);
});

describe('BE-08: GET /api/categories', () => {
  it('유효한 토큰으로 조회 시 200과 카테고리 목록을 반환한다', async () => {
    mockGetCategories.mockResolvedValue([FAKE_DEFAULT_CATEGORY, FAKE_USER_CATEGORY]);
    const app = buildApp();

    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data.categories).toHaveLength(2);
  });

  it('응답에 is_default: true인 카테고리가 포함된다', async () => {
    mockGetCategories.mockResolvedValue([FAKE_DEFAULT_CATEGORY, FAKE_USER_CATEGORY]);
    const app = buildApp();

    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    const defaultCat = (res.body.data.categories as typeof FAKE_DEFAULT_CATEGORY[]).find(
      (c) => c.isDefault === true,
    );
    expect(defaultCat).toBeDefined();
    expect(defaultCat?.name).toBe('일반');
  });

  it('Authorization 없이 접근 시 401을 반환한다', async () => {
    const app = buildApp();

    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(401);
  });
});

describe('BE-08: POST /api/categories', () => {
  it('새 카테고리 생성 시 201을 반환한다', async () => {
    mockCreateCategory.mockResolvedValue(FAKE_USER_CATEGORY);
    const app = buildApp();

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ name: '새 카테고리' });

    expect(res.status).toBe(201);
    expect(res.body.data.category.name).toBe('내 카테고리');
  });

  it('중복 이름으로 생성 시 409를 반환한다', async () => {
    mockCreateCategory.mockRejectedValue(new ConflictError('이미 존재하는 카테고리입니다'));
    const app = buildApp();

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ name: '내 카테고리' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('name 없이 요청 시 422를 반환한다', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({});

    expect(res.status).toBe(422);
  });

  it('Authorization 없이 접근 시 401을 반환한다', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/categories')
      .send({ name: '새 카테고리' });

    expect(res.status).toBe(401);
  });

  it('createCategory 서비스가 올바른 인자로 호출된다', async () => {
    mockCreateCategory.mockResolvedValue(FAKE_USER_CATEGORY);
    const app = buildApp();

    await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ name: '테스트' });

    expect(mockCreateCategory).toHaveBeenCalledWith('user-uuid-123', '테스트');
  });
});

describe('BE-08: DELETE /api/categories/:id', () => {
  it('소유한 카테고리 삭제 시 200을 반환한다', async () => {
    mockDeleteCategory.mockResolvedValue(undefined);
    const app = buildApp();

    const res = await request(app)
      .delete('/api/categories/user-cat-id')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('기본 카테고리 삭제 시도 시 403을 반환한다 (BR-06)', async () => {
    mockDeleteCategory.mockRejectedValue(new ForbiddenError('기본 카테고리는 삭제할 수 없습니다'));
    const app = buildApp();

    const res = await request(app)
      .delete('/api/categories/default-cat-id')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('타 사용자 카테고리 삭제 시도 시 403을 반환한다 (BR-03)', async () => {
    mockDeleteCategory.mockRejectedValue(new ForbiddenError('해당 카테고리를 삭제할 권한이 없습니다'));
    const app = buildApp();

    const res = await request(app)
      .delete('/api/categories/other-cat-id')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(403);
  });

  it('존재하지 않는 카테고리 삭제 시도 시 404를 반환한다', async () => {
    mockDeleteCategory.mockRejectedValue(new NotFoundError('카테고리를 찾을 수 없습니다'));
    const app = buildApp();

    const res = await request(app)
      .delete('/api/categories/non-existent')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(404);
  });

  it('Authorization 없이 접근 시 401을 반환한다', async () => {
    const app = buildApp();

    const res = await request(app).delete('/api/categories/user-cat-id');

    expect(res.status).toBe(401);
  });

  it('deleteCategory 서비스가 올바른 userId와 categoryId로 호출된다', async () => {
    mockDeleteCategory.mockResolvedValue(undefined);
    const app = buildApp();

    await request(app)
      .delete('/api/categories/user-cat-id')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(mockDeleteCategory).toHaveBeenCalledWith('user-uuid-123', 'user-cat-id');
  });
});
