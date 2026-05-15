/**
 * BE-11 통합 테스트: User API (실제 PostgreSQL)
 */

import request from 'supertest';
import { app } from '../../src/app';
import { closePool } from '../../src/db/pool';
import { initTestDatabase, clearAllTables, closeTestPool } from '../helpers/dbSetup';

const VALID_USER = {
  email: 'user_test@example.com',
  password: 'Password123',
  name: '테스터',
};

let accessToken: string;

async function signupAndGetToken(userData = VALID_USER) {
  const res = await request(app).post('/api/auth/signup').send(userData);
  return res.body.data.accessToken as string;
}

beforeAll(async () => {
  await initTestDatabase();
});

beforeEach(async () => {
  await clearAllTables();
  accessToken = await signupAndGetToken();
});

afterAll(async () => {
  await closeTestPool();
  await closePool();
});

describe('BE-11: GET /api/users/me', () => {
  it('유효한 토큰으로 조회 시 200과 사용자 정보를 반환한다', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(VALID_USER.email);
  });

  it('응답에 password_hash 필드가 포함되지 않는다', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.body.data.user).not.toHaveProperty('password_hash');
    expect(res.body.data.user).not.toHaveProperty('password');
  });

  it('토큰 없이 접근 시 401을 반환한다', async () => {
    const res = await request(app).get('/api/users/me');

    expect(res.status).toBe(401);
  });
});

describe('BE-11: PATCH /api/users/me', () => {
  it('이름 변경 성공 시 200과 업데이트된 정보를 반환한다', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '새이름' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('새이름');
  });

  it('올바른 현재 비밀번호로 비밀번호 변경 시 200을 반환한다', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: VALID_USER.password, newPassword: 'NewPassword456' });

    expect(res.status).toBe(200);
  });

  it('현재 비밀번호 불일치 시 401을 반환한다', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'WrongPass123', newPassword: 'NewPassword456' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('name 없이 currentPassword만 보내면 422를 반환한다', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: VALID_USER.password });

    expect(res.status).toBe(422);
  });
});

describe('BE-11: DELETE /api/users/me', () => {
  it('올바른 비밀번호로 탈퇴 시 200을 반환한다', async () => {
    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: VALID_USER.password });

    expect(res.status).toBe(200);
  });

  it('탈퇴 후 동일 이메일로 login 시 401이 반환된다', async () => {
    await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: VALID_USER.password });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });

    expect(loginRes.status).toBe(401);
  });

  it('비밀번호 불일치로 탈퇴 시 401을 반환한다', async () => {
    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: 'WrongPass123' });

    expect(res.status).toBe(401);
  });

  it('password 필드 없이 탈퇴 시도 시 422를 반환한다', async () => {
    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(422);
  });
});
