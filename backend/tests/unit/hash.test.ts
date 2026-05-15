/**
 * BE-03 완료 조건 검증: 비밀번호 해싱 유틸리티
 * - hashPassword → comparePassword 왕복 검증이 정상 동작한다
 */

// bcrypt salt rounds를 4로 설정하여 테스트 속도 향상
jest.mock('../../src/config/env', () => ({
  config: {
    BCRYPT_SALT_ROUNDS: 4,
    DATABASE_URL: 'postgresql://test:test@localhost/test',
    NODE_ENV: 'test',
    PORT: 3000,
    JWT_ACCESS_SECRET: 'test-access-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    DB_POOL_MAX: 5,
    DB_IDLE_TIMEOUT_MS: 30000,
    DB_CONNECTION_TIMEOUT_MS: 5000,
    CORS_ORIGIN: 'http://localhost:5173',
  },
}));

import { hashPassword, comparePassword } from '../../src/utils/hash';

describe('BE-03: 비밀번호 해싱 유틸리티', () => {
  describe('hashPassword', () => {
    it('비밀번호를 해시 문자열로 반환한다', async () => {
      const hash = await hashPassword('myPassword123');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('같은 비밀번호도 매번 다른 해시값을 생성한다 (salt 적용)', async () => {
      const hash1 = await hashPassword('samePassword');
      const hash2 = await hashPassword('samePassword');
      expect(hash1).not.toBe(hash2);
    });

    it('bcrypt 형식의 해시를 반환한다 ($2b$ 접두사)', async () => {
      const hash = await hashPassword('testPassword');
      expect(hash).toMatch(/^\$2[ab]\$/);
    });

    it('빈 문자열도 해시할 수 있다', async () => {
      const hash = await hashPassword('');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('comparePassword', () => {
    it('올바른 비밀번호와 해시 비교 시 true를 반환한다', async () => {
      const password = 'correctPassword123';
      const hash = await hashPassword(password);
      const result = await comparePassword(password, hash);
      expect(result).toBe(true);
    });

    it('잘못된 비밀번호와 해시 비교 시 false를 반환한다', async () => {
      const hash = await hashPassword('correctPassword123');
      const result = await comparePassword('wrongPassword456', hash);
      expect(result).toBe(false);
    });

    it('대소문자를 구분한다', async () => {
      const hash = await hashPassword('Password123');
      const result = await comparePassword('password123', hash);
      expect(result).toBe(false);
    });

    it('빈 문자열 비교도 올바르게 처리한다', async () => {
      const hash = await hashPassword('');
      const emptyMatch = await comparePassword('', hash);
      const nonEmptyMatch = await comparePassword('notEmpty', hash);
      expect(emptyMatch).toBe(true);
      expect(nonEmptyMatch).toBe(false);
    });
  });

  describe('hashPassword → comparePassword 왕복 검증', () => {
    const testCases = [
      'simplePassword',
      'Password123!@#',
      '한글비밀번호123',
      'a'.repeat(72), // bcrypt 최대 길이
    ];

    it.each(testCases)('"%s" 왕복 검증이 성공한다', async (password) => {
      const hash = await hashPassword(password);
      const isMatch = await comparePassword(password, hash);
      expect(isMatch).toBe(true);
    });

    it('다른 비밀번호로는 해시가 일치하지 않는다', async () => {
      const hash = await hashPassword('original');
      const wrongMatch = await comparePassword('different', hash);
      expect(wrongMatch).toBe(false);
    });
  });
});
