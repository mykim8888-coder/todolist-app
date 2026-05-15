/**
 * BE-11 통합 테스트: Todo API (실제 PostgreSQL)
 * - 필터 정확성(BR-08)
 * - 카테고리 소유권(BR-04)
 * - 날짜 역전(BR-05)
 * - 소유권(BR-03)
 */

import request from 'supertest';
import { app } from '../../src/app';
import { closePool, pool } from '../../src/db/pool';
import { initTestDatabase, clearAllTables, closeTestPool } from '../helpers/dbSetup';

const USER_A = { email: 'todo_user_a@example.com', password: 'Password123', name: '사용자A' };
const USER_B = { email: 'todo_user_b@example.com', password: 'Password123', name: '사용자B' };

let tokenA: string;
let tokenB: string;
let defaultCatId: string;

async function signupAndGetToken(userData: typeof USER_A) {
  const res = await request(app).post('/api/auth/signup').send(userData);
  return res.body.data.accessToken as string;
}

async function getDefaultCategoryId(token: string): Promise<string> {
  const res = await request(app).get('/api/categories').set('Authorization', `Bearer ${token}`);
  const defaultCat = res.body.data.categories.find(
    (c: { isDefault: boolean; id: string }) => c.isDefault,
  );
  return defaultCat.id;
}

beforeAll(async () => {
  await initTestDatabase();
});

beforeEach(async () => {
  await clearAllTables();
  tokenA = await signupAndGetToken(USER_A);
  tokenB = await signupAndGetToken(USER_B);
  defaultCatId = await getDefaultCategoryId(tokenA);
});

afterAll(async () => {
  await closeTestPool();
  await closePool();
});

describe('BE-11: GET /api/todos', () => {
  it('할일 목록 조회 시 200을 반환한다', async () => {
    const res = await request(app)
      .get('/api/todos')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.todos).toBeDefined();
  });

  it('is_completed=false 필터가 적용된다 (BR-08)', async () => {
    // 완료 할일 생성
    const todo1Res = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: '미완료 할일', categoryId: defaultCatId });
    await request(app)
      .patch(`/api/todos/${todo1Res.body.data.todo.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ isCompleted: true });

    // 미완료 할일 생성
    await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: '진행중 할일', categoryId: defaultCatId });

    const res = await request(app)
      .get('/api/todos?is_completed=false')
      .set('Authorization', `Bearer ${tokenA}`);

    const todos = res.body.data.todos as { isCompleted: boolean }[];
    expect(todos.every((t) => t.isCompleted === false)).toBe(true);
  });

  it('expired=true 필터로 만료된 미완료 할일만 반환된다 (BR-08)', async () => {
    // 만료된 할일 (due_date가 과거)
    await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: '만료된 할일', categoryId: defaultCatId, dueDate: '2020-01-01' });

    // 미래 할일
    await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: '미래 할일', categoryId: defaultCatId, dueDate: '2099-12-31' });

    const res = await request(app)
      .get('/api/todos?is_completed=false&expired=true')
      .set('Authorization', `Bearer ${tokenA}`);

    const todos = res.body.data.todos as { title: string }[];
    expect(todos.some((t) => t.title === '만료된 할일')).toBe(true);
    expect(todos.some((t) => t.title === '미래 할일')).toBe(false);
  });

  it('Authorization 없이 접근 시 401을 반환한다', async () => {
    const res = await request(app).get('/api/todos');

    expect(res.status).toBe(401);
  });
});

describe('BE-11: GET /api/todos/:id', () => {
  it('본인 소유 할일 조회 시 200을 반환한다', async () => {
    const createRes = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: '내 할일', categoryId: defaultCatId });
    const todoId = createRes.body.data.todo.id;

    const res = await request(app)
      .get(`/api/todos/${todoId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
  });

  it('타 사용자 할일 조회 시 403을 반환한다 (BR-03)', async () => {
    const createRes = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'A의 할일', categoryId: defaultCatId });
    const todoId = createRes.body.data.todo.id;

    const res = await request(app)
      .get(`/api/todos/${todoId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(403);
  });
});

describe('BE-11: POST /api/todos', () => {
  it('기본 카테고리로 할일 생성 시 201을 반환한다', async () => {
    const res = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: '새 할일', categoryId: defaultCatId });

    expect(res.status).toBe(201);
    expect(res.body.data.todo.title).toBe('새 할일');
  });

  it('타 사용자 카테고리로 할일 생성 시 403을 반환한다 (BR-04)', async () => {
    // B의 카테고리 생성
    const catRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'B의 카테고리' });
    const bCatId = catRes.body.data.category.id;

    // A가 B의 카테고리 사용 시도
    const res = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: '할일', categoryId: bCatId });

    expect(res.status).toBe(403);
  });

  it('존재하지 않는 카테고리로 할일 생성 시 404를 반환한다 (BR-04)', async () => {
    const res = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: '할일', categoryId: '00000000-0000-0000-0000-000000000000' });

    expect(res.status).toBe(404);
  });

  it('dueDate < startDate인 요청 시 422를 반환한다 (BR-05)', async () => {
    const res = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: '날짜오류',
        categoryId: defaultCatId,
        startDate: '2026-12-31',
        dueDate: '2026-01-01',
      });

    expect(res.status).toBe(422);
  });

  it('DB에 할일이 실제로 저장된다', async () => {
    const createRes = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'DB 저장 확인', categoryId: defaultCatId });

    const { rows } = await pool.query<{ title: string }>(
      'SELECT title FROM todos WHERE id = $1',
      [createRes.body.data.todo.id],
    );

    expect(rows[0].title).toBe('DB 저장 확인');
  });
});

describe('BE-11: PATCH /api/todos/:id', () => {
  let todoId: string;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: '수정 대상 할일', categoryId: defaultCatId });
    todoId = res.body.data.todo.id;
  });

  it('본인 소유 할일 수정 시 200을 반환한다', async () => {
    const res = await request(app)
      .patch(`/api/todos/${todoId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: '수정된 제목' });

    expect(res.status).toBe(200);
    expect(res.body.data.todo.title).toBe('수정된 제목');
  });

  it('타 사용자 할일 수정 시도 시 403을 반환한다 (BR-03)', async () => {
    const res = await request(app)
      .patch(`/api/todos/${todoId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ title: '수정 시도' });

    expect(res.status).toBe(403);
  });

  it('날짜 역전 수정 시 422를 반환한다 (BR-05)', async () => {
    const res = await request(app)
      .patch(`/api/todos/${todoId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ startDate: '2026-12-31', dueDate: '2026-01-01' });

    expect(res.status).toBe(422);
  });

  it('isCompleted 토글이 DB에 반영된다', async () => {
    await request(app)
      .patch(`/api/todos/${todoId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ isCompleted: true });

    const { rows } = await pool.query<{ is_completed: boolean }>(
      'SELECT is_completed FROM todos WHERE id = $1',
      [todoId],
    );

    expect(rows[0].is_completed).toBe(true);
  });
});

describe('BE-11: DELETE /api/todos/:id', () => {
  it('본인 소유 할일 삭제 시 200을 반환한다', async () => {
    const createRes = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: '삭제될 할일', categoryId: defaultCatId });
    const todoId = createRes.body.data.todo.id;

    const res = await request(app)
      .delete(`/api/todos/${todoId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
  });

  it('삭제 후 DB에서 실제로 제거된다', async () => {
    const createRes = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'DB 삭제 확인', categoryId: defaultCatId });
    const todoId = createRes.body.data.todo.id;

    await request(app)
      .delete(`/api/todos/${todoId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    const { rows } = await pool.query('SELECT id FROM todos WHERE id = $1', [todoId]);
    expect(rows).toHaveLength(0);
  });

  it('타 사용자 할일 삭제 시도 시 403을 반환한다 (BR-03)', async () => {
    const createRes = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'A의 할일', categoryId: defaultCatId });
    const todoId = createRes.body.data.todo.id;

    const res = await request(app)
      .delete(`/api/todos/${todoId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(403);
  });
});
