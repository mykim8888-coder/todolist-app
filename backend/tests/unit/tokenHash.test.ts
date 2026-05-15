/**
 * BE-03 완료 조건 검증: 토큰 해싱 유틸리티
 * - hashToken이 동일 입력에 대해 항상 동일한 SHA-256 hex 문자열을 반환한다
 */

import { hashToken } from '../../src/utils/tokenHash';

describe('BE-03: 토큰 SHA-256 해싱 유틸리티', () => {
  describe('hashToken 결정론적 동작', () => {
    it('동일 입력에 대해 항상 동일한 해시를 반환한다', () => {
      const token = 'some-refresh-token-value';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      const hash3 = hashToken(token);
      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it('다른 입력에 대해 다른 해시를 반환한다', () => {
      const hash1 = hashToken('token-A');
      const hash2 = hashToken('token-B');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('SHA-256 출력 형식', () => {
    it('64자리 hex 문자열을 반환한다 (SHA-256 = 256비트 = 32바이트 = 64 hex chars)', () => {
      const hash = hashToken('any-token');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('소문자 hex 문자열을 반환한다', () => {
      const hash = hashToken('test-token');
      expect(hash).toBe(hash.toLowerCase());
    });

    it('알려진 SHA-256 값과 일치한다', () => {
      // echo -n "hello" | sha256sum = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
      const hash = hashToken('hello');
      expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });
  });

  describe('엣지 케이스', () => {
    it('빈 문자열도 해시할 수 있다', () => {
      const hash = hashToken('');
      expect(hash).toHaveLength(64);
      // echo -n "" | sha256sum = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('긴 JWT 토큰도 정상 해시된다', () => {
      const longToken = 'a'.repeat(500);
      const hash = hashToken(longToken);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('특수문자가 포함된 토큰도 정상 해시된다', () => {
      const specialToken = 'token.with/special+chars=and&more';
      const hash = hashToken(specialToken);
      expect(hash).toHaveLength(64);
    });
  });
});
