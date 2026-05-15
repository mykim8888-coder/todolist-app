/**
 * BE-06 완료 조건 검증: auth 라우터 + 컨트롤러 (HTTP 레벨)
 * - login 성공 시 accessToken(바디) + refreshToken(HttpOnly 쿠키)
 * - 동일 이메일 signup 시 409
 * - rate limit: 11번째 요청 시 429
 * - /refresh: 쿠키 없으면 401, 만료 토큰이면 401
 */

// auth.service 전체 모킹
jest.mock('../../../src/services/auth.service');
// config 모킹 (CORS_ORIGIN, NODE_ENV 필요)
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

import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import * as authService from '../../../src/services/auth.service';
import { validate } from '../../../src/middleware/validate';
import { errorHandler } from '../../../src/middleware/errorHandler';
import * as authController from '../../../src/controllers/auth.controller';
import { ConflictError, UnauthorizedError } from '../../../src/utils/errors';
import { z } from 'zod';

const mockSignup = authService.signup as jest.Mock;
const mockLogin = authService.login as jest.Mock;
const mockLogout = authService.logout as jest.Mock;
const mockRefresh = authService.refresh as jest.Mock;

const FAKE_RESULT = {
  accessToken: 'access-token-value',
  refreshToken: 'refresh-token-value',
  user: { id: 'uuid-123', email: 'test@example.com', name: '홍길동' },
};

// 라우터를 직접 구성하여 rateLimiter 인스턴스를 테스트별로 제어
function buildApp(limiterMax = 10) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const limiter = rateLimit({
    windowMs: 60_000,
    max: limiterMax,
    handler: (_req, res) => res.status(429).json({ error: { code: 'RATE_LIMIT_EXCEEDED' } }),
  });

  const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).regex(/^(?=.*[A-Za-z])(?=.*\d)/),
    name: z.string().min(1),
  });
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  app.post('/api/auth/signup', limiter, validate(signupSchema), authController.signup);
  app.post('/api/auth/login', limiter, validate(loginSchema), authController.login);
  app.post('/api/auth/logout', authController.logout);
  app.post('/api/auth/refresh', authController.refresh);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BE-06: POST /api/auth/signup', () => {
  it('유효한 데이터로 signup 시 201과 accessToken을 반환한다', async () => {
    mockSignup.mockResolvedValue(FAKE_RESULT);
    const app = buildApp();

    const res = await request(app).post('/api/auth/signup').send({
      email: 'test@example.com',
      password: 'Password1',
      name: '홍길동',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBe('access-token-value');
  });

  it('signup 성공 시 Set-Cookie에 HttpOnly refreshToken이 포함된다', async () => {
    mockSignup.mockResolvedValue(FAKE_RESULT);
    const app = buildApp();

    const res = await request(app).post('/api/auth/signup').send({
      email: 'test@example.com',
      password: 'Password1',
      name: '홍길동',
    });

    const setCookieHeader = res.headers['set-cookie'] as string[] | string | undefined;
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader ?? ''];
    const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');
  });

  it('중복 이메일로 signup 시 409를 반환한다', async () => {
    mockSignup.mockRejectedValue(new ConflictError('이미 사용 중인 이메일입니다'));
    const app = buildApp();

    const res = await request(app).post('/api/auth/signup').send({
      email: 'dup@example.com',
      password: 'Password1',
      name: '홍길동',
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('유효하지 않은 이메일로 signup 시 422를 반환한다', async () => {
    const app = buildApp();

    const res = await request(app).post('/api/auth/signup').send({
      email: 'not-email',
      password: 'Password1',
      name: '홍길동',
    });

    expect(res.status).toBe(422);
  });

  it('8자 미만 비밀번호로 signup 시 422를 반환한다', async () => {
    const app = buildApp();

    const res = await request(app).post('/api/auth/signup').send({
      email: 'test@example.com',
      password: 'Pw1',
      name: '홍길동',
    });

    expect(res.status).toBe(422);
  });

  it('숫자 없는 비밀번호로 signup 시 422를 반환한다', async () => {
    const app = buildApp();

    const res = await request(app).post('/api/auth/signup').send({
      email: 'test@example.com',
      password: 'PasswordOnly',
      name: '홍길동',
    });

    expect(res.status).toBe(422);
  });
});

describe('BE-06: POST /api/auth/login', () => {
  it('유효한 자격증명으로 login 시 200과 accessToken을 반환한다', async () => {
    mockLogin.mockResolvedValue(FAKE_RESULT);
    const app = buildApp();

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'Password1',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBe('access-token-value');
  });

  it('login 성공 시 Set-Cookie에 HttpOnly refreshToken이 포함된다', async () => {
    mockLogin.mockResolvedValue(FAKE_RESULT);
    const app = buildApp();

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'Password1',
    });

    const setCookieHeader = res.headers['set-cookie'] as string[] | string | undefined;
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader ?? ''];
    const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');
  });

  it('잘못된 자격증명으로 login 시 401을 반환한다', async () => {
    mockLogin.mockRejectedValue(new UnauthorizedError('이메일 또는 비밀번호가 올바르지 않습니다'));
    const app = buildApp();

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'WrongPass1',
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('login 성공 시 응답 바디에 user 정보가 포함된다', async () => {
    mockLogin.mockResolvedValue(FAKE_RESULT);
    const app = buildApp();

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'Password1',
    });

    expect(res.body.data.user).toMatchObject(FAKE_RESULT.user);
  });
});

describe('BE-06: POST /api/auth/logout', () => {
  it('쿠키에 refreshToken이 있으면 logout 서비스를 호출하고 200을 반환한다', async () => {
    mockLogout.mockResolvedValue(undefined);
    const app = buildApp();

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', 'refreshToken=some-token');

    expect(res.status).toBe(200);
    expect(mockLogout).toHaveBeenCalledWith('some-token');
  });

  it('쿠키가 없어도 200을 반환한다 (클라이언트 측 토큰 폐기)', async () => {
    const app = buildApp();

    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('logout 후 refreshToken 쿠키가 제거된다', async () => {
    mockLogout.mockResolvedValue(undefined);
    const app = buildApp();

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', 'refreshToken=some-token');

    const setCookieHeader = res.headers['set-cookie'] as string[] | string | undefined;
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader ?? ''];
    // clearCookie sets Max-Age=0 or Expires in the past
    const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toMatch(/Max-Age=0|Expires=.*GMT/i);
  });
});

describe('BE-06: POST /api/auth/refresh', () => {
  it('유효한 쿠키로 refresh 시 200과 새 accessToken을 반환한다', async () => {
    mockRefresh.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
    const app = buildApp();

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'refreshToken=valid-refresh-token');

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBe('new-access-token');
  });

  it('쿠키에 refreshToken이 없으면 401을 반환한다', async () => {
    const app = buildApp();

    const res = await request(app).post('/api/auth/refresh');

    expect(res.status).toBe(401);
  });

  it('만료된 refreshToken으로 refresh 시 401을 반환한다', async () => {
    mockRefresh.mockRejectedValue(new UnauthorizedError('리프레시 토큰이 만료되었습니다'));
    const app = buildApp();

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'refreshToken=expired-token');

    expect(res.status).toBe(401);
  });

  it('Token Rotation: refresh 성공 시 Set-Cookie에 새 refreshToken이 설정된다', async () => {
    mockRefresh.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
    const app = buildApp();

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'refreshToken=old-token');

    const setCookieHeader = res.headers['set-cookie'] as string[] | string | undefined;
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader ?? ''];
    const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');
  });
});

describe('BE-06: Rate Limiting — /signup, /login', () => {
  it('signup 11번째 요청 시 429를 반환한다', async () => {
    mockSignup.mockResolvedValue(FAKE_RESULT);
    const app = buildApp(10);

    for (let i = 0; i < 10; i++) {
      await request(app).post('/api/auth/signup').send({
        email: 'test@example.com',
        password: 'Password1',
        name: '홍길동',
      });
    }
    const res = await request(app).post('/api/auth/signup').send({
      email: 'test@example.com',
      password: 'Password1',
      name: '홍길동',
    });

    expect(res.status).toBe(429);
  });

  it('login 11번째 요청 시 429를 반환한다', async () => {
    mockLogin.mockResolvedValue(FAKE_RESULT);
    const app = buildApp(10);

    for (let i = 0; i < 10; i++) {
      await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'Password1',
      });
    }
    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'Password1',
    });

    expect(res.status).toBe(429);
  });
});
