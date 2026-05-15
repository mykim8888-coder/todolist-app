/**
 * BE-05 완료 조건 검증: user.repository
 * - createUser 후 findByEmail로 동일 레코드 조회
 * - findByEmail이 없는 이메일에 null 반환
 * - updateUser가 전달된 필드만 UPDATE
 * - deleteUser가 PoolClient를 받아 외부 트랜잭션에 참여
 */

// pool 모듈 모킹
jest.mock('../../../src/db/pool', () => ({
  pool: { query: jest.fn() },
}));

import { pool } from '../../../src/db/pool';
import {
  createUser,
  findByEmail,
  findById,
  updateUser,
  deleteUser,
} from '../../../src/repositories/user.repository';
import { UserRow } from '../../../src/types/user.types';

const mockQuery = pool.query as jest.Mock;

const fakeUser: UserRow = {
  id: 'user-uuid-123',
  email: 'test@example.com',
  password_hash: '$2b$12$hashedpassword',
  name: '홍길동',
  auth_provider: 'local',
  provider_id: null,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BE-05: user.repository', () => {
  describe('createUser', () => {
    it('INSERT SQL을 실행하고 생성된 UserRow를 반환한다', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [fakeUser], rowCount: 1 });

      const result = await createUser({
        email: 'test@example.com',
        passwordHash: '$2b$12$hashedpassword',
        name: '홍길동',
      });

      expect(result).toEqual(fakeUser);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['test@example.com', '$2b$12$hashedpassword', '홍길동']),
      );
    });

    it('authProvider 기본값은 local이다', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [fakeUser], rowCount: 1 });

      await createUser({ email: 'a@b.com', passwordHash: 'hash', name: 'test' });

      const callArgs = mockQuery.mock.calls[0][1] as unknown[];
      expect(callArgs).toContain('local');
    });

    it('providerId가 없으면 null로 전달된다', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [fakeUser], rowCount: 1 });

      await createUser({ email: 'a@b.com', passwordHash: 'hash', name: 'test' });

      const callArgs = mockQuery.mock.calls[0][1] as unknown[];
      expect(callArgs).toContain(null);
    });

    it('authProvider와 providerId를 지정할 수 있다', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [fakeUser], rowCount: 1 });

      await createUser({
        email: 'a@b.com',
        passwordHash: '',
        name: 'google user',
        authProvider: 'google',
        providerId: 'google-provider-id',
      });

      const callArgs = mockQuery.mock.calls[0][1] as unknown[];
      expect(callArgs).toContain('google');
      expect(callArgs).toContain('google-provider-id');
    });
  });

  describe('findByEmail', () => {
    it('이메일로 사용자를 찾으면 UserRow를 반환한다', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [fakeUser] });

      const result = await findByEmail('test@example.com');

      expect(result).toEqual(fakeUser);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE email = $1'),
        ['test@example.com'],
      );
    });

    it('존재하지 않는 이메일에 대해 null을 반환한다', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await findByEmail('notexist@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('ID로 사용자를 찾으면 UserRow를 반환한다', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [fakeUser] });

      const result = await findById('user-uuid-123');

      expect(result).toEqual(fakeUser);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        ['user-uuid-123'],
      );
    });

    it('존재하지 않는 ID에 대해 null을 반환한다', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateUser — 동적 SET 쿼리', () => {
    it('name만 업데이트하면 name만 SET 절에 포함된다', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ ...fakeUser, name: '새 이름' }] });

      const result = await updateUser('user-uuid-123', { name: '새 이름' });

      expect(result?.name).toBe('새 이름');
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('name = $1');
      expect(sql).not.toContain('password_hash');
    });

    it('passwordHash만 업데이트하면 password_hash만 SET 절에 포함된다', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [fakeUser] });

      await updateUser('user-uuid-123', { passwordHash: 'newHash' });

      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('password_hash = $1');
      expect(sql).not.toContain('name');
    });

    it('name과 passwordHash 모두 업데이트하면 둘 다 SET 절에 포함된다', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [fakeUser] });

      await updateUser('user-uuid-123', { name: '새 이름', passwordHash: 'newHash' });

      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('name');
      expect(sql).toContain('password_hash');
    });

    it('업데이트할 필드가 없으면 findById를 호출하여 현재 사용자를 반환한다', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [fakeUser] });

      const result = await updateUser('user-uuid-123', {});

      expect(result).toEqual(fakeUser);
      // findById용 SELECT가 호출됨
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('SELECT');
    });

    it('WHERE 절에 id가 포함된다', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [fakeUser] });

      await updateUser('user-uuid-123', { name: '새 이름' });

      const callArgs = mockQuery.mock.calls[0][1] as unknown[];
      expect(callArgs).toContain('user-uuid-123');
    });

    it('RETURNING *을 포함하여 업데이트된 레코드를 반환한다', async () => {
      const updatedUser = { ...fakeUser, name: '업데이트됨' };
      mockQuery.mockResolvedValueOnce({ rows: [updatedUser] });

      const result = await updateUser('user-uuid-123', { name: '업데이트됨' });

      expect(result).toEqual(updatedUser);
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('RETURNING');
    });

    it('사용자가 없으면 null을 반환한다', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await updateUser('nonexistent', { name: '이름' });

      expect(result).toBeNull();
    });
  });

  describe('deleteUser — PoolClient 트랜잭션 참여', () => {
    it('pool.query가 아닌 전달된 client.query를 사용한다', async () => {
      const mockClient = { query: jest.fn().mockResolvedValue({ rowCount: 1 }) };

      await deleteUser(mockClient as never, 'user-uuid-123');

      // PoolClient의 query가 호출되어야 함
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      // pool.query는 호출되지 않아야 함 (외부 트랜잭션 참여)
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('DELETE FROM users WHERE id = $1로 쿼리한다', async () => {
      const mockClient = { query: jest.fn().mockResolvedValue({ rowCount: 1 }) };

      await deleteUser(mockClient as never, 'user-uuid-123');

      const [sql, params] = mockClient.query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('DELETE FROM users');
      expect(sql).toContain('WHERE id = $1');
      expect(params).toEqual(['user-uuid-123']);
    });

    it('void를 반환한다 (결과값 불필요)', async () => {
      const mockClient = { query: jest.fn().mockResolvedValue({ rowCount: 1 }) };

      const result = await deleteUser(mockClient as never, 'user-uuid-123');

      expect(result).toBeUndefined();
    });
  });
});
