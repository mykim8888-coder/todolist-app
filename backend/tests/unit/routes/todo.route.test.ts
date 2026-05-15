/**
 * BE-09 완료 조건 검증: todo 라우터 + 컨트롤러 (HTTP 레벨)
 * - GET /api/todos?is_completed=false&expired=true → 필터 전달
 * - POST /api/todos: 타 사용자 category_id 사용 시 403, dueDate < startDate 시 422
 * - PATCH /api/todos/:id: 타 사용자 소유 시 403
 * - DELETE /api/todos/:id: 타 사용자 소유 시 403
 */

jest.mock('../../../src/services/todo.service');
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
import * as todoService from '../../../src/services/todo.service';
import * as jwtUtils from '../../../src/utils/jwt';
import { authenticate } from '../../../src/middleware/authenticate';
import { validate } from '../../../src/middleware/validate';
import { errorHandler } from '../../../src/middleware/errorHandler';
import * as todoController from '../../../src/controllers/todo.controller';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../src/utils/errors';
import { z } from 'zod';

const mockGetTodos = todoService.getTodos as jest.Mock;
const mockGetTodo = todoService.getTodo as jest.Mock;
const mockCreateTodo = todoService.createTodo as jest.Mock;
const mockUpdateTodo = todoService.updateTodo as jest.Mock;
const mockDeleteTodo = todoService.deleteTodo as jest.Mock;
const mockVerifyAccessToken = jwtUtils.verifyAccessToken as jest.Mock;

const FAKE_JWT_PAYLOAD = { sub: 'user-uuid-123', email: 'test@example.com' };
const VALID_TOKEN = 'valid-access-token';

const FAKE_TODO = {
  id: 'todo-uuid-001',
  userId: 'user-uuid-123',
  categoryId: 'cat-uuid-001',
  title: '테스트 할일',
  description: null,
  startDate: null,
  dueDate: null,
  isCompleted: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function buildApp() {
  const app = express();
  app.use(express.json());

  const createSchema = z.object({
    title: z.string().min(1).max(255),
    categoryId: z.string().uuid(),
    description: z.string().optional(),
    startDate: z.string().regex(dateRegex).optional(),
    dueDate: z.string().regex(dateRegex).optional(),
  });

  const updateSchema = z.object({
    title: z.string().min(1).max(255).optional(),
    categoryId: z.string().uuid().optional(),
    description: z.string().nullable().optional(),
    startDate: z.string().regex(dateRegex).nullable().optional(),
    dueDate: z.string().regex(dateRegex).nullable().optional(),
    isCompleted: z.boolean().optional(),
  });

  app.get('/api/todos', authenticate, todoController.getTodos);
  app.post('/api/todos', authenticate, validate(createSchema), todoController.createTodo);
  app.get('/api/todos/:id', authenticate, todoController.getTodo);
  app.patch('/api/todos/:id', authenticate, validate(updateSchema), todoController.updateTodo);
  app.delete('/api/todos/:id', authenticate, todoController.deleteTodo);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockVerifyAccessToken.mockReturnValue(FAKE_JWT_PAYLOAD);
});

describe('BE-09: GET /api/todos', () => {
  it('유효한 토큰으로 조회 시 200과 할일 목록을 반환한다', async () => {
    mockGetTodos.mockResolvedValue([FAKE_TODO]);
    const app = buildApp();

    const res = await request(app)
      .get('/api/todos')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data.todos).toHaveLength(1);
  });

  it('is_completed=false&expired=true 쿼리 파라미터가 서비스에 전달된다 (BR-08)', async () => {
    mockGetTodos.mockResolvedValue([]);
    const app = buildApp();

    await request(app)
      .get('/api/todos?is_completed=false&expired=true')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(mockGetTodos).toHaveBeenCalledWith(
      'user-uuid-123',
      expect.objectContaining({ isCompleted: false, expired: true }),
    );
  });

  it('category_id 쿼리 파라미터가 서비스에 전달된다', async () => {
    mockGetTodos.mockResolvedValue([]);
    const app = buildApp();

    await request(app)
      .get('/api/todos?category_id=cat-uuid-001')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(mockGetTodos).toHaveBeenCalledWith(
      'user-uuid-123',
      expect.objectContaining({ categoryId: 'cat-uuid-001' }),
    );
  });

  it('Authorization 없이 접근 시 401을 반환한다', async () => {
    const app = buildApp();

    const res = await request(app).get('/api/todos');

    expect(res.status).toBe(401);
  });
});

describe('BE-09: GET /api/todos/:id', () => {
  it('본인 소유 할일 조회 시 200을 반환한다', async () => {
    mockGetTodo.mockResolvedValue(FAKE_TODO);
    const app = buildApp();

    const res = await request(app)
      .get('/api/todos/todo-uuid-001')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data.todo.id).toBe(FAKE_TODO.id);
  });

  it('타 사용자 할일 조회 시 403을 반환한다 (BR-03)', async () => {
    mockGetTodo.mockRejectedValue(new ForbiddenError('접근 권한이 없습니다'));
    const app = buildApp();

    const res = await request(app)
      .get('/api/todos/other-todo')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(403);
  });

  it('존재하지 않는 할일 조회 시 404를 반환한다', async () => {
    mockGetTodo.mockRejectedValue(new NotFoundError('할일을 찾을 수 없습니다'));
    const app = buildApp();

    const res = await request(app)
      .get('/api/todos/non-existent')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(404);
  });
});

describe('BE-09: POST /api/todos', () => {
  it('유효한 데이터로 생성 시 201을 반환한다', async () => {
    mockCreateTodo.mockResolvedValue(FAKE_TODO);
    const app = buildApp();

    const res = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ title: '테스트 할일', categoryId: 'aaaaaaaa-0000-0000-0000-000000000001' });

    expect(res.status).toBe(201);
    expect(res.body.data.todo).toBeDefined();
  });

  it('타 사용자 카테고리로 생성 시 403을 반환한다 (BR-04)', async () => {
    mockCreateTodo.mockRejectedValue(new ForbiddenError('해당 카테고리를 사용할 권한이 없습니다'));
    const app = buildApp();

    const res = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ title: '할일', categoryId: 'aaaaaaaa-0000-0000-0000-000000000002' });

    expect(res.status).toBe(403);
  });

  it('존재하지 않는 카테고리로 생성 시 404를 반환한다 (BR-04)', async () => {
    mockCreateTodo.mockRejectedValue(new NotFoundError('카테고리를 찾을 수 없습니다'));
    const app = buildApp();

    const res = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ title: '할일', categoryId: 'aaaaaaaa-0000-0000-0000-000000000003' });

    expect(res.status).toBe(404);
  });

  it('dueDate < startDate인 요청 시 422를 반환한다 (BR-05)', async () => {
    mockCreateTodo.mockRejectedValue(new ValidationError('종료예정일은 시작일 이후여야 합니다'));
    const app = buildApp();

    const res = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({
        title: '할일',
        categoryId: 'aaaaaaaa-0000-0000-0000-000000000001',
        startDate: '2026-12-31',
        dueDate: '2026-01-01',
      });

    expect(res.status).toBe(422);
  });

  it('title 없이 요청 시 422를 반환한다', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ categoryId: 'aaaaaaaa-0000-0000-0000-000000000001' });

    expect(res.status).toBe(422);
  });

  it('categoryId 없이 요청 시 422를 반환한다', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ title: '할일' });

    expect(res.status).toBe(422);
  });
});

describe('BE-09: PATCH /api/todos/:id', () => {
  it('할일 수정 성공 시 200을 반환한다', async () => {
    mockUpdateTodo.mockResolvedValue({ ...FAKE_TODO, title: '수정된 할일' });
    const app = buildApp();

    const res = await request(app)
      .patch('/api/todos/todo-uuid-001')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ title: '수정된 할일' });

    expect(res.status).toBe(200);
    expect(res.body.data.todo.title).toBe('수정된 할일');
  });

  it('타 사용자 할일 수정 시도 시 403을 반환한다 (BR-03)', async () => {
    mockUpdateTodo.mockRejectedValue(new ForbiddenError('해당 할일을 수정할 권한이 없습니다'));
    const app = buildApp();

    const res = await request(app)
      .patch('/api/todos/other-todo-id')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ title: '수정' });

    expect(res.status).toBe(403);
  });

  it('날짜 역전 수정 시 422를 반환한다 (BR-05)', async () => {
    mockUpdateTodo.mockRejectedValue(new ValidationError('종료예정일은 시작일 이후여야 합니다'));
    const app = buildApp();

    const res = await request(app)
      .patch('/api/todos/todo-uuid-001')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ startDate: '2026-12-31', dueDate: '2026-01-01' });

    expect(res.status).toBe(422);
  });

  it('Authorization 없이 접근 시 401을 반환한다', async () => {
    const app = buildApp();

    const res = await request(app)
      .patch('/api/todos/todo-uuid-001')
      .send({ title: '수정' });

    expect(res.status).toBe(401);
  });
});

describe('BE-09: DELETE /api/todos/:id', () => {
  it('본인 소유 할일 삭제 시 200을 반환한다', async () => {
    mockDeleteTodo.mockResolvedValue(undefined);
    const app = buildApp();

    const res = await request(app)
      .delete('/api/todos/todo-uuid-001')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('타 사용자 할일 삭제 시도 시 403을 반환한다 (BR-03)', async () => {
    mockDeleteTodo.mockRejectedValue(new ForbiddenError('해당 할일을 삭제할 권한이 없습니다'));
    const app = buildApp();

    const res = await request(app)
      .delete('/api/todos/other-todo-id')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('존재하지 않는 할일 삭제 시도 시 404를 반환한다', async () => {
    mockDeleteTodo.mockRejectedValue(new NotFoundError('할일을 찾을 수 없습니다'));
    const app = buildApp();

    const res = await request(app)
      .delete('/api/todos/non-existent')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(404);
  });

  it('Authorization 없이 접근 시 401을 반환한다', async () => {
    const app = buildApp();

    const res = await request(app).delete('/api/todos/todo-uuid-001');

    expect(res.status).toBe(401);
  });
});
