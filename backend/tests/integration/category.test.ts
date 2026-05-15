/**
 * BE-11 통합 테스트: Category API (실제 PostgreSQL)
 * - 기본 카테고리 포함 조회
 * - 중복명 409
 * - 기본 카테고리 삭제 거부(BR-06)
 * - 소속 할일 기본 카테고리 재배정 DB 직접 확인(BR-07)
 * - 타 사용자 403(BR-03)
 */

import request from 'supertest';
import { app } from '../../src/app';
import { closePool, pool } from '../../src/db/pool';
import { initTestDatabase, clearAllTables, closeTestPool } from '../helpers/dbSetup';

const USER_A = { email: 'cat_user_a@example.com', password: 'Password123', name: '사용자A' };
const USER_B = { email: 'cat_user_b@example.com', password: 'Password123', name: '사용자B' };

let tokenA: string;
let tokenB: string;

async function signupAndGetToken(userData: typeof USER_A) {
  const res = await request(app).post('/api/auth/signup').send(userData);
  return res.body.data.accessToken as string;
}

beforeAll(async () => {
  await initTestDatabase();
});

beforeEach(async () => {
  await clearAllTables();
  tokenA = await signupAndGetToken(USER_A);
  tokenB = await signupAndGetToken(USER_B);
});

afterAll(async () => {
  await closeTestPool();
  await closePool();
});

describe('BE-11: GET /api/categories', () => {
  it('조회 시 is_default: true인 기본 카테고리가 포함된다', async () => {
    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const defaultCat = res.body.data.categories.find(
      (c: { isDefault: boolean }) => c.isDefault === true,
    );
    expect(defaultCat).toBeDefined();
  });

  it("기본 카테고리 '일반'이 응답에 포함된다", async () => {
    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${tokenA}`);

    const names = res.body.data.categories.map((c: { name: string }) => c.name);
    expect(names).toContain('일반');
  });

  it('Authorization 없이 접근 시 401을 반환한다', async () => {
    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(401);
  });
});

describe('BE-11: POST /api/categories', () => {
  it('새 카테고리 생성 시 201을 반환한다', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: '새카테고리' });

    expect(res.status).toBe(201);
    expect(res.body.data.category.name).toBe('새카테고리');
  });

  it('동일 이름의 카테고리 중복 생성 시 409를 반환한다', async () => {
    await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: '중복카테고리' });

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: '중복카테고리' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('다른 사용자는 같은 이름의 카테고리를 생성할 수 있다', async () => {
    await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: '공유이름' });

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: '공유이름' });

    expect(res.status).toBe(201);
  });

  it('name 없이 요청 시 422를 반환한다', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({});

    expect(res.status).toBe(422);
  });
});

describe('BE-11: DELETE /api/categories/:id', () => {
  it('기본 카테고리 삭제 시도 시 403을 반환한다 (BR-06)', async () => {
    const catRes = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${tokenA}`);

    const defaultCat = catRes.body.data.categories.find(
      (c: { isDefault: boolean; id: string }) => c.isDefault,
    );

    const res = await request(app)
      .delete(`/api/categories/${defaultCat.id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('카테고리 삭제 성공 시 200을 반환한다', async () => {
    const createRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: '삭제할카테고리' });
    const catId = createRes.body.data.category.id;

    const res = await request(app)
      .delete(`/api/categories/${catId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
  });

  it('카테고리 삭제 시 소속 할일이 기본 카테고리로 재배정된다 DB 직접 확인 (BR-07)', async () => {
    // 1. 사용자 카테고리 생성
    const createCatRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: '삭제될카테고리' });
    const catId = createCatRes.body.data.category.id as string;

    // 2. 기본 카테고리 ID 조회
    const catListRes = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${tokenA}`);
    const defaultCat = catListRes.body.data.categories.find(
      (c: { isDefault: boolean; id: string }) => c.isDefault,
    );
    const defaultCatId = defaultCat.id as string;

    // 3. 해당 카테고리로 할일 생성
    const todoRes = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: '재배정될 할일', categoryId: catId });
    const todoId = todoRes.body.data.todo.id as string;

    // 4. 카테고리 삭제
    await request(app)
      .delete(`/api/categories/${catId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    // 5. DB에서 할일의 category_id 직접 확인
    const { rows } = await pool.query<{ category_id: string }>(
      'SELECT category_id FROM todos WHERE id = $1',
      [todoId],
    );

    expect(rows[0].category_id).toBe(defaultCatId);
  });

  it('타 사용자 카테고리 삭제 시도 시 403을 반환한다 (BR-03)', async () => {
    const createRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'A의 카테고리' });
    const catId = createRes.body.data.category.id;

    const res = await request(app)
      .delete(`/api/categories/${catId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(403);
  });

  it('존재하지 않는 카테고리 삭제 시도 시 404를 반환한다', async () => {
    const res = await request(app)
      .delete('/api/categories/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
  });
});
