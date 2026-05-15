/**
 * BE-02 완료 조건 검증: withTransaction 헬퍼
 * - 성공 시 COMMIT 보장
 * - 콜백 예외 발생 시 ROLLBACK 보장
 * - finally에서 client.release() 보장
 */

import { withTransaction } from '../../src/db/transaction';

// pool 모듈 전체를 모킹하여 env.ts import 없이 테스트
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockClient = {
  query: mockQuery,
  release: mockRelease,
};

jest.mock('../../src/db/pool', () => ({
  pool: {
    connect: jest.fn(),
  },
}));

// 모킹 후 import
import { pool } from '../../src/db/pool';
const mockConnect = pool.connect as jest.Mock;

describe('BE-02: withTransaction 헬퍼', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(mockClient);
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    mockRelease.mockReturnValue(undefined);
  });

  describe('성공 경로', () => {
    it('콜백 성공 시 BEGIN → callback → COMMIT 순서로 실행된다', async () => {
      const callOrder: string[] = [];
      mockQuery.mockImplementation(async (sql: string) => {
        callOrder.push(sql);
        return { rows: [], rowCount: 0 };
      });

      const callback = jest.fn().mockImplementation(async () => {
        callOrder.push('callback');
        return 'result';
      });

      await withTransaction(callback);

      expect(callOrder).toEqual(['BEGIN', 'callback', 'COMMIT']);
    });

    it('콜백 반환값을 그대로 반환한다', async () => {
      const expected = { id: 'uuid-123', name: 'test' };
      const callback = jest.fn().mockResolvedValue(expected);

      const result = await withTransaction(callback);

      expect(result).toEqual(expected);
    });

    it('콜백에 PoolClient가 전달된다', async () => {
      const receivedClient: unknown[] = [];
      const callback = jest.fn().mockImplementation(async (client: unknown) => {
        receivedClient.push(client);
        return null;
      });

      await withTransaction(callback);

      expect(receivedClient[0]).toBe(mockClient);
    });

    it('성공 시 ROLLBACK은 호출되지 않는다', async () => {
      const callback = jest.fn().mockResolvedValue('ok');

      await withTransaction(callback);

      const rollbackCalled = mockQuery.mock.calls.some(
        (call: string[]) => call[0] === 'ROLLBACK',
      );
      expect(rollbackCalled).toBe(false);
    });

    it('성공 시에도 finally에서 client.release()가 호출된다', async () => {
      const callback = jest.fn().mockResolvedValue('ok');

      await withTransaction(callback);

      expect(mockRelease).toHaveBeenCalledTimes(1);
    });
  });

  describe('실패 경로 — ROLLBACK 보장', () => {
    it('콜백에서 예외 발생 시 ROLLBACK이 호출된다', async () => {
      const error = new Error('콜백 오류');
      const callback = jest.fn().mockRejectedValue(error);

      await expect(withTransaction(callback)).rejects.toThrow('콜백 오류');

      const rollbackCalled = mockQuery.mock.calls.some(
        (call: string[]) => call[0] === 'ROLLBACK',
      );
      expect(rollbackCalled).toBe(true);
    });

    it('콜백에서 예외 발생 시 COMMIT은 호출되지 않는다', async () => {
      const callback = jest.fn().mockRejectedValue(new Error('실패'));

      await expect(withTransaction(callback)).rejects.toThrow();

      const commitCalled = mockQuery.mock.calls.some(
        (call: string[]) => call[0] === 'COMMIT',
      );
      expect(commitCalled).toBe(false);
    });

    it('콜백 예외 발생 시에도 finally에서 client.release()가 호출된다', async () => {
      const callback = jest.fn().mockRejectedValue(new Error('실패'));

      await expect(withTransaction(callback)).rejects.toThrow();

      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('콜백 예외가 그대로 rethrow된다', async () => {
      const customError = new TypeError('타입 오류');
      const callback = jest.fn().mockRejectedValue(customError);

      await expect(withTransaction(callback)).rejects.toThrow(TypeError);
      await expect(withTransaction(callback)).rejects.toThrow('타입 오류');
    });

    it('BEGIN → ROLLBACK 순서로 실행된다 (COMMIT 없음)', async () => {
      const callOrder: string[] = [];
      mockQuery.mockImplementation(async (sql: string) => {
        callOrder.push(sql);
        return { rows: [], rowCount: 0 };
      });
      const callback = jest.fn().mockRejectedValue(new Error('실패'));

      await expect(withTransaction(callback)).rejects.toThrow();

      expect(callOrder[0]).toBe('BEGIN');
      expect(callOrder).toContain('ROLLBACK');
      expect(callOrder).not.toContain('COMMIT');
    });
  });

  describe('Pool 연결 실패 경로', () => {
    it('pool.connect() 실패 시 예외가 전파된다', async () => {
      mockConnect.mockRejectedValue(new Error('연결 실패'));

      await expect(withTransaction(jest.fn())).rejects.toThrow('연결 실패');
    });

    it('pool.connect() 실패 시 BEGIN/COMMIT/ROLLBACK이 호출되지 않는다', async () => {
      mockConnect.mockRejectedValue(new Error('연결 실패'));

      await expect(withTransaction(jest.fn())).rejects.toThrow();

      expect(mockQuery).not.toHaveBeenCalled();
    });
  });
});
