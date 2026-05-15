/**
 * BE-04 완료 조건 검증: validate 미들웨어
 * - zod 스키마 위반 요청 시 422 응답과 필드별 오류 상세가 반환된다
 */

import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { validate } from '../../../src/middleware/validate';
import { errorHandler } from '../../../src/middleware/errorHandler';

const testSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
  name: z.string().min(1, '이름은 필수입니다'),
});

function buildApp() {
  const app = express();
  app.use(express.json());
  app.post('/test', validate(testSchema), (req, res) => {
    res.status(200).json({ received: req.body });
  });
  app.use(errorHandler);
  return app;
}

describe('BE-04: validate 미들웨어', () => {
  let app: express.Express;

  beforeEach(() => {
    app = buildApp();
  });

  describe('유효한 요청 바디', () => {
    it('스키마를 통과하면 200을 반환하고 next()가 호출된다', async () => {
      const res = await request(app).post('/test').send({
        email: 'test@example.com',
        password: 'password123',
        name: '홍길동',
      });
      expect(res.status).toBe(200);
    });

    it('파싱된 데이터가 req.body에 세팅된다', async () => {
      const payload = { email: 'test@example.com', password: 'password123', name: '홍길동' };
      const res = await request(app).post('/test').send(payload);
      expect(res.body.received).toMatchObject(payload);
    });
  });

  describe('유효하지 않은 요청 바디', () => {
    it('필수 필드 누락 시 422를 반환한다', async () => {
      const res = await request(app).post('/test').send({ email: 'test@example.com' });
      expect(res.status).toBe(422);
    });

    it('422 응답에 error.code가 VALIDATION_ERROR이다', async () => {
      const res = await request(app).post('/test').send({});
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('이메일 형식 오류 시 422와 필드별 오류 상세가 반환된다', async () => {
      const res = await request(app).post('/test').send({
        email: 'not-an-email',
        password: 'password123',
        name: '홍길동',
      });
      expect(res.status).toBe(422);
      const details = res.body.error.details as Array<{ field: string; message: string }>;
      const emailError = details.find((d) => d.field === 'email');
      expect(emailError).toBeDefined();
      expect(emailError?.message).toBe('올바른 이메일 형식이 아닙니다');
    });

    it('비밀번호 최소 길이 미달 시 422와 필드 오류가 반환된다', async () => {
      const res = await request(app).post('/test').send({
        email: 'test@example.com',
        password: 'short',
        name: '홍길동',
      });
      expect(res.status).toBe(422);
      const details = res.body.error.details as Array<{ field: string; message: string }>;
      const passError = details.find((d) => d.field === 'password');
      expect(passError?.message).toBe('비밀번호는 최소 8자 이상이어야 합니다');
    });

    it('여러 필드 오류가 있을 때 모두 반환된다', async () => {
      const res = await request(app).post('/test').send({});
      expect(res.status).toBe(422);
      const details = res.body.error.details as Array<{ field: string }>;
      expect(details.length).toBeGreaterThan(1);
    });

    it('빈 바디를 보내면 422를 반환한다', async () => {
      const res = await request(app).post('/test').send({});
      expect(res.status).toBe(422);
    });
  });

  describe('중첩 필드 오류 경로', () => {
    const nestedSchema = z.object({
      user: z.object({
        profile: z.object({
          bio: z.string().min(1, 'bio가 필요합니다'),
        }),
      }),
    });

    it('중첩 필드 오류가 dot-notation으로 표시된다', async () => {
      const nestedApp = express();
      nestedApp.use(express.json());
      nestedApp.post('/nested', validate(nestedSchema), (req, res) => res.json(req.body));
      nestedApp.use(errorHandler);

      const res = await request(nestedApp).post('/nested').send({ user: { profile: { bio: '' } } });
      expect(res.status).toBe(422);
      const details = res.body.error.details as Array<{ field: string }>;
      expect(details.some((d) => d.field === 'user.profile.bio')).toBe(true);
    });
  });
});
