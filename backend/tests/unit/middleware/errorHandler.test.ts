/**
 * BE-04 완료 조건 검증: errorHandler 미들웨어
 * - AppError → 올바른 statusCode JSON 응답
 * - 알 수 없는 오류 → 500
 * - production에서 스택트레이스 미노출
 */

import express from 'express';
import request from 'supertest';
import { errorHandler } from '../../../src/middleware/errorHandler';
import {
  AppError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../../src/utils/errors';

function buildApp(throwFn: () => void) {
  const app = express();
  app.get('/test', () => { throwFn(); });
  app.use(errorHandler);
  return app;
}

function buildAsyncApp(errorToThrow: unknown) {
  const app = express();
  app.get('/test', (_req, _res, next) => { next(errorToThrow); });
  app.use(errorHandler);
  return app;
}

const originalNodeEnv = process.env.NODE_ENV;

afterAll(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

describe('BE-04: errorHandler 미들웨어', () => {
  describe('AppError 계층 처리', () => {
    it('UnauthorizedError → 401 JSON 응답', async () => {
      const app = buildAsyncApp(new UnauthorizedError('인증 실패'));
      const res = await request(app).get('/test');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toBe('인증 실패');
    });

    it('ForbiddenError → 403 JSON 응답', async () => {
      const app = buildAsyncApp(new ForbiddenError('권한 없음'));
      const res = await request(app).get('/test');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('NotFoundError → 404 JSON 응답', async () => {
      const app = buildAsyncApp(new NotFoundError('없음'));
      const res = await request(app).get('/test');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('ConflictError → 409 JSON 응답', async () => {
      const app = buildAsyncApp(new ConflictError('중복'));
      const res = await request(app).get('/test');
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('ValidationError → 422 JSON 응답', async () => {
      const app = buildAsyncApp(new ValidationError('유효성 오류'));
      const res = await request(app).get('/test');
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('커스텀 statusCode AppError → 해당 상태코드 응답', async () => {
      const app = buildAsyncApp(new AppError(418, 'IM_A_TEAPOT', '찻주전자'));
      const res = await request(app).get('/test');
      expect(res.status).toBe(418);
      expect(res.body.error.code).toBe('IM_A_TEAPOT');
    });

    it('응답 바디에 error.code와 error.message만 포함한다', async () => {
      const app = buildAsyncApp(new UnauthorizedError());
      const res = await request(app).get('/test');
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code');
      expect(res.body.error).toHaveProperty('message');
      expect(res.body.error).not.toHaveProperty('stack');
    });
  });

  describe('알 수 없는 오류 → 500', () => {
    it('일반 Error → 500 JSON 응답', async () => {
      process.env.NODE_ENV = 'development';
      const app = buildAsyncApp(new Error('예상치 못한 오류'));
      const res = await request(app).get('/test');
      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('문자열 오류 → 500 JSON 응답', async () => {
      process.env.NODE_ENV = 'development';
      const app = buildAsyncApp('string error');
      const res = await request(app).get('/test');
      expect(res.status).toBe(500);
    });

    it('숫자 오류 → 500 JSON 응답', async () => {
      process.env.NODE_ENV = 'development';
      const app = buildAsyncApp(42);
      const res = await request(app).get('/test');
      expect(res.status).toBe(500);
    });
  });

  describe('production 환경 — 스택트레이스 미노출', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('production에서 500 오류 시 stack이 응답에 포함되지 않는다', async () => {
      const app = buildAsyncApp(new Error('서버 오류'));
      const res = await request(app).get('/test');
      expect(res.status).toBe(500);
      expect(res.body.error.stack).toBeUndefined();
    });

    it('production에서 500 응답 메시지가 기본 메시지이다', async () => {
      const app = buildAsyncApp(new Error('내부 오류 상세'));
      const res = await request(app).get('/test');
      expect(res.body.error.message).toBe('서버 오류가 발생했습니다');
    });
  });

  describe('development 환경 — 스택트레이스 노출', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('development에서 500 오류 시 stack이 응답에 포함된다', async () => {
      const app = buildAsyncApp(new Error('개발 오류'));
      const res = await request(app).get('/test');
      expect(res.status).toBe(500);
      expect(res.body.error.stack).toBeDefined();
    });
  });
});
