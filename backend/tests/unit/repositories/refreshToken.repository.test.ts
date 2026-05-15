/**
 * BE-05 완료 조건 검증: refreshToken.repository
 * - createToken, findByTokenHash, deleteByTokenHash
 * - deleteByUserId(PoolClient) — 외부 트랜잭션 참여
 * - deleteExpiredTokens — 만료 토큰 배치 삭제
 */

jest.mock('../../../src/db/pool', () => ({
  pool: { query: jest.fn() },
}));

import { pool } from '../../../src/db/pool';
import {
  createToken,
  findByTokenHash,
  deleteByTokenHash,
  deleteByUserId,
  deleteExpiredTokens,
  RefreshTokenRow,
} from '../../../src/repositories/refreshToken.repository';

const mockQuery = pool.query as jest.Mock;

const fakeToken: RefreshTokenRow = {
  id: 'token-uuid-456',
  user_id: 'user-uuid-123',
  token_hash: 'a'.repeat(64),
  expires_at: new Date('2026-06-01'),
  created_at: new Date('2026-01-01'),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BE-05: refreshToken.repository', () => {
  describe('createToken', () => {
    it('INSERT INTO refresh_tokens SQL을 실행한다', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await createToken({
        userId: 'user-uuid-123',
        tokenHash: 'a'.repeat(64),
        expiresAt: new Date('2026-06-01'),
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO refresh_tokens'),
        expect.arrayContaining(['user-uuid-123', 'a'.repeat(64)]),
      );
    });

    it('void를 반환한다', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await createToken({
        userId: 'user-uuid',
        tokenHash: 'hash',
        expiresAt: new Date(),
      });

      expect(result).toBeUndefined();
    });

    it('expiresAt 값이 쿼리 파라미터에 포함된다', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      const expiresAt = new Date('2026-06-01');

      await createToken({ userId: 'uid', tokenHash: 'hash', expiresAt });

      const callArgs = mockQuery.mock.calls[0][1] as unknown[];
      expect(callArgs).toContain(expiresAt);
    });
  });

  describe('findByTokenHash', () => {
    it('token_hash로 RefreshTokenRow를 반환한다', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [fakeToken] });

      const result = await findByTokenHash('a'.repeat(64));

      expect(result).toEqual(fakeToken);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE token_hash = $1'),
        ['a'.repeat(64)],
      );
    });

    it('토큰이 없으면 null을 반환한다', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await findByTokenHash('nonexistent-hash');

      expect(result).toBeNull();
    });
  });

  describe('deleteByTokenHash', () => {
    it('DELETE SQL을 올바른 파라미터로 실행한다', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      await deleteByTokenHash('a'.repeat(64));

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM refresh_tokens WHERE token_hash = $1'),
        ['a'.repeat(64)],
      );
    });

    it('void를 반환한다', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await deleteByTokenHash('hash');

      expect(result).toBeUndefined();
    });
  });

  describe('deleteByUserId — PoolClient 트랜잭션 참여', () => {
    it('pool.query가 아닌 전달된 client.query를 사용한다', async () => {
      const mockClient = { query: jest.fn().mockResolvedValue({ rowCount: 1 }) };

      await deleteByUserId(mockClient as never, 'user-uuid-123');

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('DELETE FROM refresh_tokens WHERE user_id = $1로 쿼리한다', async () => {
      const mockClient = { query: jest.fn().mockResolvedValue({ rowCount: 2 }) };

      await deleteByUserId(mockClient as never, 'user-uuid-123');

      const [sql, params] = mockClient.query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('DELETE FROM refresh_tokens');
      expect(sql).toContain('WHERE user_id = $1');
      expect(params).toEqual(['user-uuid-123']);
    });

    it('void를 반환한다', async () => {
      const mockClient = { query: jest.fn().mockResolvedValue({ rowCount: 1 }) };

      const result = await deleteByUserId(mockClient as never, 'user-uuid-123');

      expect(result).toBeUndefined();
    });
  });

  describe('deleteExpiredTokens', () => {
    it('만료된 토큰을 삭제하는 SQL을 실행한다', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 3 });

      await deleteExpiredTokens();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM refresh_tokens WHERE expires_at < now()'),
      );
    });

    it('삭제된 행 수를 반환한다', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 5 });

      const deleted = await deleteExpiredTokens();

      expect(deleted).toBe(5);
    });

    it('삭제된 행이 없으면 0을 반환한다', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const deleted = await deleteExpiredTokens();

      expect(deleted).toBe(0);
    });

    it('rowCount가 null이면 0을 반환한다', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: null });

      const deleted = await deleteExpiredTokens();

      expect(deleted).toBe(0);
    });
  });
});
