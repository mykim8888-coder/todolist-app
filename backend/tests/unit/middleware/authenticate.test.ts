/**
 * BE-04 완료 조건 검증: authenticate 미들웨어
 * - 유효하지 않은 JWT로 보호 엔드포인트 접근 시 401 JSON 응답이 반환된다
 */

import express from 'express';
import request from 'supertest';

// verifyAccessToken 모킹
jest.mock('../../../src/utils/jwt', () => ({
  verifyAccessToken: jest.fn(),
}));

import { verifyAccessToken } from '../../../src/utils/jwt';
import { authenticate } from '../../../src/middleware/authenticate';
import { errorHandler } from '../../../src/middleware/errorHandler';
import { UnauthorizedError } from '../../../src/utils/errors';
import { JwtPayload } from '../../../src/utils/jwt';

const mockVerify = verifyAccessToken as jest.Mock;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.get('/protected', authenticate, (_req, res) => {
    res.json({ user: _req.user });
  });
  app.use(errorHandler);
  return app;
}

describe('BE-04: authenticate 미들웨어', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  describe('Authorization 헤더 없음', () => {
    it('헤더가 없으면 401을 반환한다', async () => {
      const res = await request(app).get('/protected');
      expect(res.status).toBe(401);
    });

    it('401 응답 바디에 error.code가 UNAUTHORIZED이다', async () => {
      const res = await request(app).get('/protected');
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Authorization 헤더 형식 오류', () => {
    it('"Bearer " 접두사 없이 토큰만 전달하면 401을 반환한다', async () => {
      const res = await request(app).get('/protected').set('Authorization', 'just-token');
      expect(res.status).toBe(401);
    });

    it('"Basic " 스킴으로 전달하면 401을 반환한다', async () => {
      const res = await request(app).get('/protected').set('Authorization', 'Basic dXNlcjpwYXNz');
      expect(res.status).toBe(401);
    });

    it('"Bearer" (공백 없음)으로 전달하면 401을 반환한다', async () => {
      const res = await request(app).get('/protected').set('Authorization', 'Bearertoken');
      expect(res.status).toBe(401);
    });
  });

  describe('유효하지 않은 JWT', () => {
    it('변조된 토큰이면 401을 반환한다', async () => {
      mockVerify.mockImplementation(() => {
        throw new UnauthorizedError('유효하지 않은 액세스 토큰입니다');
      });
      const res = await request(app).get('/protected').set('Authorization', 'Bearer tampered-token');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('만료된 토큰이면 401을 반환한다', async () => {
      mockVerify.mockImplementation(() => {
        throw new UnauthorizedError('유효하지 않은 액세스 토큰입니다');
      });
      const res = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer expired-token');
      expect(res.status).toBe(401);
    });
  });

  describe('유효한 JWT', () => {
    const mockPayload: JwtPayload = { sub: 'user-uuid', email: 'test@example.com' };

    it('유효한 토큰이면 200을 반환한다', async () => {
      mockVerify.mockReturnValue(mockPayload);
      const res = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer valid-token');
      expect(res.status).toBe(200);
    });

    it('req.user에 페이로드가 세팅된다', async () => {
      mockVerify.mockReturnValue(mockPayload);
      const res = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer valid-token');
      expect(res.body.user).toEqual(mockPayload);
    });

    it('verifyAccessToken에 Bearer 이후 토큰 문자열이 전달된다', async () => {
      mockVerify.mockReturnValue(mockPayload);
      await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer my-actual-token');
      expect(mockVerify).toHaveBeenCalledWith('my-actual-token');
    });
  });
});
