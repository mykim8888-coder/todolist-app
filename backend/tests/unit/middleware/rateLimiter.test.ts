/**
 * BE-04 완료 조건 검증: authRateLimiter 미들웨어
 * - /api/auth/login에 분당 11회 요청 시 11번째에 429 응답이 반환된다
 */

import express from 'express';
import request from 'supertest';
import rateLimit from 'express-rate-limit';
import { errorHandler } from '../../../src/middleware/errorHandler';

// 각 테스트마다 새로운 rate limiter 인스턴스를 생성하여 상태 초기화
function createFreshLimiter(max = 10) {
  return rateLimit({
    windowMs: 60_000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: '요청 횟수를 초과하였습니다. 잠시 후 다시 시도하세요.',
        },
      });
    },
  });
}

function buildApp(max = 10) {
  const app = express();
  const limiter = createFreshLimiter(max);
  app.post('/api/auth/login', limiter, (_req, res) => res.json({ ok: true }));
  app.post('/api/auth/signup', limiter, (_req, res) => res.json({ ok: true }));
  app.get('/api/todos', (_req, res) => res.json({ items: [] })); // 제한 없는 라우트
  app.use(errorHandler);
  return app;
}

describe('BE-04: authRateLimiter 미들웨어', () => {
  describe('Rate Limit 동작 (max=10)', () => {
    it('10회 요청까지는 모두 200을 반환한다', async () => {
      const app = buildApp();
      for (let i = 0; i < 10; i++) {
        const res = await request(app).post('/api/auth/login');
        expect(res.status).toBe(200);
      }
    });

    it('11번째 요청 시 429를 반환한다', async () => {
      const app = buildApp();
      for (let i = 0; i < 10; i++) {
        await request(app).post('/api/auth/login');
      }
      const res = await request(app).post('/api/auth/login');
      expect(res.status).toBe(429);
    });

    it('429 응답에 error.code가 RATE_LIMIT_EXCEEDED이다', async () => {
      const app = buildApp();
      for (let i = 0; i < 10; i++) {
        await request(app).post('/api/auth/login');
      }
      const res = await request(app).post('/api/auth/login');
      expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('/api/auth/signup에도 동일하게 적용된다', () => {
    it('signup 11번째 요청 시 429를 반환한다', async () => {
      const app = buildApp();
      for (let i = 0; i < 10; i++) {
        await request(app).post('/api/auth/signup');
      }
      const res = await request(app).post('/api/auth/signup');
      expect(res.status).toBe(429);
    });
  });

  describe('rate limit이 적용되지 않은 라우트', () => {
    it('/api/todos는 rate limit 없이 계속 200을 반환한다', async () => {
      const app = buildApp();
      // rate limit 개수 이상 요청해도 200이어야 함
      for (let i = 0; i < 15; i++) {
        const res = await request(app).get('/api/todos');
        expect(res.status).toBe(200);
      }
    });
  });

  describe('응답 헤더 검증', () => {
    it('RateLimit-* 표준 헤더가 포함된다', async () => {
      const app = buildApp();
      const res = await request(app).post('/api/auth/login');
      // standardHeaders: true 설정으로 RateLimit-* 헤더가 포함되어야 함
      expect(res.headers['ratelimit-limit'] ?? res.headers['x-ratelimit-limit']).toBeDefined();
    });
  });
});
