/**
 * BE-03 완료 조건 검증: JWT 유틸리티
 * - verifyAccessToken이 만료·변조 토큰에 대해 UnauthorizedError를 throw한다
 */

// config 모듈을 모킹하여 실제 env 검증 없이 테스트
jest.mock('../../src/config/env', () => ({
  config: {
    JWT_ACCESS_SECRET: 'test-access-secret-at-least-32-chars-long',
    JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-chars-long',
    BCRYPT_SALT_ROUNDS: 4,
    DATABASE_URL: 'postgresql://test:test@localhost/test',
    NODE_ENV: 'test',
    PORT: 3000,
    DB_POOL_MAX: 5,
    DB_IDLE_TIMEOUT_MS: 30000,
    DB_CONNECTION_TIMEOUT_MS: 5000,
    CORS_ORIGIN: 'http://localhost:5173',
  },
}));

import jwt from 'jsonwebtoken';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  JwtPayload,
} from '../../src/utils/jwt';
import { UnauthorizedError } from '../../src/utils/errors';

const TEST_PAYLOAD: JwtPayload = {
  sub: 'user-uuid-123',
  email: 'test@example.com',
};

const ACCESS_SECRET = 'test-access-secret-at-least-32-chars-long';
const REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars-long';

describe('BE-03: JWT 유틸리티', () => {
  describe('signAccessToken', () => {
    it('올바른 JWT 문자열을 반환한다', () => {
      const token = signAccessToken(TEST_PAYLOAD);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('페이로드의 sub와 email이 포함된다', () => {
      const token = signAccessToken(TEST_PAYLOAD);
      const decoded = jwt.decode(token) as JwtPayload & { exp?: number };
      expect(decoded.sub).toBe(TEST_PAYLOAD.sub);
      expect(decoded.email).toBe(TEST_PAYLOAD.email);
    });

    it('만료시간(exp)이 포함된다 (15분)', () => {
      const before = Math.floor(Date.now() / 1000);
      const token = signAccessToken(TEST_PAYLOAD);
      const decoded = jwt.decode(token) as { exp: number; iat: number };
      const ttl = decoded.exp - decoded.iat;
      expect(ttl).toBe(15 * 60); // 15분 = 900초
      expect(decoded.exp).toBeGreaterThan(before);
    });
  });

  describe('signRefreshToken', () => {
    it('올바른 JWT 문자열을 반환한다', () => {
      const token = signRefreshToken(TEST_PAYLOAD);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('만료시간이 7일이다', () => {
      const token = signRefreshToken(TEST_PAYLOAD);
      const decoded = jwt.decode(token) as { exp: number; iat: number };
      const ttl = decoded.exp - decoded.iat;
      expect(ttl).toBe(7 * 24 * 60 * 60); // 7일 = 604800초
    });

    it('Access Token과 다른 시크릿으로 서명된다', () => {
      const refreshToken = signRefreshToken(TEST_PAYLOAD);
      // REFRESH_SECRET으로 ACCESS_SECRET 검증 시 실패해야 함
      expect(() => jwt.verify(refreshToken, ACCESS_SECRET)).toThrow();
      // 올바른 REFRESH_SECRET으로는 성공
      expect(() => jwt.verify(refreshToken, REFRESH_SECRET)).not.toThrow();
    });
  });

  describe('verifyAccessToken', () => {
    it('유효한 토큰을 검증하여 페이로드를 반환한다', () => {
      const token = signAccessToken(TEST_PAYLOAD);
      const payload = verifyAccessToken(token);
      expect(payload.sub).toBe(TEST_PAYLOAD.sub);
      expect(payload.email).toBe(TEST_PAYLOAD.email);
    });

    it('만료된 토큰에 대해 UnauthorizedError를 throw한다', () => {
      const expiredToken = jwt.sign(TEST_PAYLOAD, ACCESS_SECRET, { expiresIn: '0s' });
      expect(() => verifyAccessToken(expiredToken)).toThrow(UnauthorizedError);
    });

    it('변조된 토큰에 대해 UnauthorizedError를 throw한다', () => {
      const token = signAccessToken(TEST_PAYLOAD);
      const tampered = token.slice(0, -5) + 'XXXXX';
      expect(() => verifyAccessToken(tampered)).toThrow(UnauthorizedError);
    });

    it('잘못된 시크릿으로 서명된 토큰에 대해 UnauthorizedError를 throw한다', () => {
      const fakeToken = jwt.sign(TEST_PAYLOAD, 'wrong-secret');
      expect(() => verifyAccessToken(fakeToken)).toThrow(UnauthorizedError);
    });

    it('빈 문자열에 대해 UnauthorizedError를 throw한다', () => {
      expect(() => verifyAccessToken('')).toThrow(UnauthorizedError);
    });

    it('Refresh 시크릿으로 서명된 토큰을 Access 검증 시 UnauthorizedError를 throw한다', () => {
      const refreshToken = signRefreshToken(TEST_PAYLOAD);
      expect(() => verifyAccessToken(refreshToken)).toThrow(UnauthorizedError);
    });

    it('throw된 에러가 AppError instanceof 체크를 통과한다', () => {
      const expiredToken = jwt.sign(TEST_PAYLOAD, ACCESS_SECRET, { expiresIn: '0s' });
      expect(() => verifyAccessToken(expiredToken)).toThrow(
        expect.objectContaining({ statusCode: 401 }),
      );
    });
  });

  describe('verifyRefreshToken', () => {
    it('유효한 Refresh Token을 검증하여 페이로드를 반환한다', () => {
      const token = signRefreshToken(TEST_PAYLOAD);
      const payload = verifyRefreshToken(token);
      expect(payload.sub).toBe(TEST_PAYLOAD.sub);
      expect(payload.email).toBe(TEST_PAYLOAD.email);
    });

    it('만료된 Refresh Token에 대해 UnauthorizedError를 throw한다', () => {
      const expiredToken = jwt.sign(TEST_PAYLOAD, REFRESH_SECRET, { expiresIn: '0s' });
      expect(() => verifyRefreshToken(expiredToken)).toThrow(UnauthorizedError);
    });

    it('Access 시크릿으로 서명된 토큰을 Refresh 검증 시 UnauthorizedError를 throw한다', () => {
      const accessToken = signAccessToken(TEST_PAYLOAD);
      expect(() => verifyRefreshToken(accessToken)).toThrow(UnauthorizedError);
    });

    it('변조된 Refresh Token에 대해 UnauthorizedError를 throw한다', () => {
      const token = signRefreshToken(TEST_PAYLOAD);
      const tampered = token.slice(0, -5) + 'YYYYY';
      expect(() => verifyRefreshToken(tampered)).toThrow(UnauthorizedError);
    });
  });
});
