/**
 * BE-11 통합 테스트: Auth API (실제 PostgreSQL)
 */

import request from 'supertest';
import { app } from '../../src/app';
import { closePool } from '../../src/db/pool';
import { initTestDatabase, clearAllTables, closeTestPool } from '../helpers/dbSetup';

const VALID_USER = {
  email: 'auth_test@example.com',
  password: 'Password123',
  name: '테스터',
};

beforeAll(async () => {
  await initTestDatabase();
});

beforeEach(async () => {
  await clearAllTables();
});

afterAll(async () => {
  await closeTestPool();
  await closePool();
});

describe('BE-11: POST /api/auth/signup', () => {
  it('유효한 데이터로 signup 시 201과 accessToken을 반환한다', async () => {
    const res = await request(app).post('/api/auth/signup').send(VALID_USER);

    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe(VALID_USER.email);
  });

  it('signup 성공 시 HttpOnly refreshToken 쿠키가 설정된다', async () => {
    const res = await request(app).post('/api/auth/signup').send(VALID_USER);

    const cookies = res.headers['set-cookie'] as unknown as string[];
    const refreshCookie = (Array.isArray(cookies) ? cookies : [cookies]).find((c: string) =>
      c.startsWith('refreshToken='),
    );
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');
  });

  it('중복 이메일로 signup 시 409를 반환한다', async () => {
    await request(app).post('/api/auth/signup').send(VALID_USER);

    const res = await request(app).post('/api/auth/signup').send(VALID_USER);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('유효하지 않은 이메일로 signup 시 422를 반환한다', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...VALID_USER, email: 'not-email' });

    expect(res.status).toBe(422);
  });

  it('8자 미만 비밀번호로 signup 시 422를 반환한다', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...VALID_USER, password: 'Pw1' });

    expect(res.status).toBe(422);
  });

  it('응답에 password_hash가 포함되지 않는다', async () => {
    const res = await request(app).post('/api/auth/signup').send(VALID_USER);

    expect(res.body.data.user).not.toHaveProperty('password_hash');
  });
});

describe('BE-11: POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/signup').send(VALID_USER);
  });

  it('올바른 자격증명으로 login 시 200과 accessToken을 반환한다', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('login 성공 시 HttpOnly refreshToken 쿠키가 설정된다', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });

    const cookies = res.headers['set-cookie'] as unknown as string[];
    const refreshCookie = (Array.isArray(cookies) ? cookies : [cookies]).find((c: string) =>
      c.startsWith('refreshToken='),
    );
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');
  });

  it('잘못된 비밀번호로 login 시 401을 반환한다', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: 'WrongPass123' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('존재하지 않는 이메일로 login 시 401을 반환한다', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nope@example.com', password: VALID_USER.password });

    expect(res.status).toBe(401);
  });
});

describe('BE-11: POST /api/auth/refresh', () => {
  let refreshCookie: string;

  beforeEach(async () => {
    const res = await request(app).post('/api/auth/signup').send(VALID_USER);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    refreshCookie = (Array.isArray(cookies) ? cookies : [cookies]).find((c: string) =>
      c.startsWith('refreshToken='),
    ) as string;
  });

  it('유효한 refreshToken 쿠키로 refresh 시 200과 새 accessToken을 반환한다', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('refresh 성공 시 새 refreshToken 쿠키가 설정된다 (Token Rotation)', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie);

    const newCookies = res.headers['set-cookie'] as unknown as string[];
    const newRefreshCookie = (Array.isArray(newCookies) ? newCookies : [newCookies]).find(
      (c: string) => c.startsWith('refreshToken='),
    );
    expect(newRefreshCookie).toBeDefined();
    expect(newRefreshCookie).toContain('HttpOnly');
  });

  it('쿠키 없이 refresh 시 401을 반환한다', async () => {
    const res = await request(app).post('/api/auth/refresh');

    expect(res.status).toBe(401);
  });
});

describe('BE-11: POST /api/auth/logout', () => {
  it('refreshToken 쿠키와 함께 logout 시 200을 반환한다', async () => {
    const signupRes = await request(app).post('/api/auth/signup').send(VALID_USER);
    const cookies = signupRes.headers['set-cookie'] as unknown as string[];
    const refreshCookie = (Array.isArray(cookies) ? cookies : [cookies]).find((c: string) =>
      c.startsWith('refreshToken='),
    ) as string;

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', refreshCookie);

    expect(res.status).toBe(200);
  });

  it('logout 후 refreshToken 쿠키가 제거된다', async () => {
    const signupRes = await request(app).post('/api/auth/signup').send(VALID_USER);
    const cookies = signupRes.headers['set-cookie'] as unknown as string[];
    const refreshCookie = (Array.isArray(cookies) ? cookies : [cookies]).find((c: string) =>
      c.startsWith('refreshToken='),
    ) as string;

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', refreshCookie);

    const setCookies = res.headers['set-cookie'] as unknown as string[];
    const clearedCookie = (Array.isArray(setCookies) ? setCookies : [setCookies]).find(
      (c: string) => c.startsWith('refreshToken='),
    );
    expect(clearedCookie).toMatch(/Max-Age=0|Expires=.*GMT/i);
  });
});
