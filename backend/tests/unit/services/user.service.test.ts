/**
 * BE-07 완료 조건 검증: user.service
 * - getMe: password_hash 미포함
 * - updateMe: currentPassword 불일치 시 UnauthorizedError
 * - deleteMe: withTransaction 순서 원자적 삭제
 * - 트랜잭션 실패 시 ROLLBACK (withTransaction이 처리)
 */

jest.mock('../../../src/config/env', () => ({
  config: {
    DATABASE_URL: 'postgresql://test:test@localhost/test',
    NODE_ENV: 'test',
    PORT: 3000,
    DB_POOL_MAX: 5,
    DB_IDLE_TIMEOUT_MS: 30000,
    DB_CONNECTION_TIMEOUT_MS: 5000,
    JWT_ACCESS_SECRET: 'test-access-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    BCRYPT_SALT_ROUNDS: 4,
    CORS_ORIGIN: 'http://localhost:5173',
  },
}));

jest.mock('../../../src/repositories/user.repository');
jest.mock('../../../src/repositories/refreshToken.repository');
jest.mock('../../../src/repositories/todo.repository');
jest.mock('../../../src/repositories/category.repository');
jest.mock('../../../src/utils/hash');
jest.mock('../../../src/db/transaction');

import * as userRepo from '../../../src/repositories/user.repository';
import * as refreshTokenRepo from '../../../src/repositories/refreshToken.repository';
import * as todoRepo from '../../../src/repositories/todo.repository';
import * as categoryRepo from '../../../src/repositories/category.repository';
import * as hashUtils from '../../../src/utils/hash';
import * as transaction from '../../../src/db/transaction';
import * as userService from '../../../src/services/user.service';
import { UnauthorizedError, NotFoundError } from '../../../src/utils/errors';
import { UserRow } from '../../../src/types/user.types';
import { PoolClient } from 'pg';

const mockFindById = userRepo.findById as jest.Mock;
const mockUpdateUser = userRepo.updateUser as jest.Mock;
const mockDeleteUser = userRepo.deleteUser as jest.Mock;
const mockDeleteTokensByUserId = refreshTokenRepo.deleteByUserId as jest.Mock;
const mockDeleteTodosByUserId = todoRepo.deleteByUserId as jest.Mock;
const mockDeleteCategoriesByUserId = categoryRepo.deleteByUserId as jest.Mock;
const mockHashPassword = hashUtils.hashPassword as jest.Mock;
const mockComparePassword = hashUtils.comparePassword as jest.Mock;
const mockWithTransaction = transaction.withTransaction as jest.Mock;

const FAKE_USER: UserRow = {
  id: 'user-uuid-123',
  email: 'test@example.com',
  password_hash: '$2b$12$hashedpw',
  name: '홍길동',
  auth_provider: 'local',
  provider_id: null,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockComparePassword.mockResolvedValue(true);
  mockHashPassword.mockResolvedValue('$2b$12$newhashedpw');
  mockWithTransaction.mockImplementation(async (cb: (client: PoolClient) => Promise<void>) => {
    const fakeClient = {} as PoolClient;
    return cb(fakeClient);
  });
});

describe('BE-07: user.service.getMe', () => {
  it('유효한 userId로 조회 시 User 객체를 반환한다', async () => {
    mockFindById.mockResolvedValue(FAKE_USER);

    const result = await userService.getMe(FAKE_USER.id);

    expect(result.id).toBe(FAKE_USER.id);
    expect(result.email).toBe(FAKE_USER.email);
    expect(result.name).toBe(FAKE_USER.name);
  });

  it('반환된 객체에 password_hash 필드가 없다', async () => {
    mockFindById.mockResolvedValue(FAKE_USER);

    const result = await userService.getMe(FAKE_USER.id);

    expect(result).not.toHaveProperty('password_hash');
  });

  it('존재하지 않는 userId로 조회 시 NotFoundError를 throw한다', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(userService.getMe('non-existent')).rejects.toThrow(NotFoundError);
  });

  it('반환 객체에 authProvider, providerId, createdAt, updatedAt이 포함된다', async () => {
    mockFindById.mockResolvedValue(FAKE_USER);

    const result = await userService.getMe(FAKE_USER.id);

    expect(result.authProvider).toBe('local');
    expect(result.providerId).toBeNull();
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
  });
});

describe('BE-07: user.service.updateMe', () => {
  it('이름만 변경 시 성공적으로 User를 반환한다', async () => {
    const updatedRow = { ...FAKE_USER, name: '새이름' };
    mockUpdateUser.mockResolvedValue(updatedRow);

    const result = await userService.updateMe(FAKE_USER.id, { name: '새이름' });

    expect(result.name).toBe('새이름');
    expect(mockUpdateUser).toHaveBeenCalledWith(FAKE_USER.id, { name: '새이름' });
  });

  it('비밀번호 변경 시 현재 비밀번호를 검증한다', async () => {
    mockFindById.mockResolvedValue(FAKE_USER);
    mockComparePassword.mockResolvedValue(true);
    const updatedRow = { ...FAKE_USER };
    mockUpdateUser.mockResolvedValue(updatedRow);

    await userService.updateMe(FAKE_USER.id, {
      currentPassword: 'Password1',
      newPassword: 'NewPassword1',
    });

    expect(mockComparePassword).toHaveBeenCalledWith('Password1', FAKE_USER.password_hash);
  });

  it('현재 비밀번호 불일치 시 UnauthorizedError를 throw한다 (BR)', async () => {
    mockFindById.mockResolvedValue(FAKE_USER);
    mockComparePassword.mockResolvedValue(false);

    await expect(
      userService.updateMe(FAKE_USER.id, {
        currentPassword: 'WrongPw1',
        newPassword: 'NewPassword1',
      }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('newPassword만 있고 currentPassword 없으면 UnauthorizedError를 throw한다', async () => {
    await expect(
      userService.updateMe(FAKE_USER.id, { newPassword: 'NewPassword1' }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('비밀번호 변경 성공 시 새 해시로 updateUser가 호출된다', async () => {
    mockFindById.mockResolvedValue(FAKE_USER);
    mockComparePassword.mockResolvedValue(true);
    mockHashPassword.mockResolvedValue('$2b$12$newhashedpw');
    mockUpdateUser.mockResolvedValue(FAKE_USER);

    await userService.updateMe(FAKE_USER.id, {
      currentPassword: 'Password1',
      newPassword: 'NewPassword1',
    });

    expect(mockUpdateUser).toHaveBeenCalledWith(
      FAKE_USER.id,
      expect.objectContaining({ passwordHash: '$2b$12$newhashedpw' }),
    );
  });

  it('password_hash 없는 사용자(OAuth)가 비밀번호 변경 시도 시 UnauthorizedError를 throw한다', async () => {
    mockFindById.mockResolvedValue({ ...FAKE_USER, password_hash: null });

    await expect(
      userService.updateMe(FAKE_USER.id, {
        currentPassword: 'any',
        newPassword: 'NewPassword1',
      }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('updateUser가 null을 반환하면 NotFoundError를 throw한다 (방어 코드)', async () => {
    mockUpdateUser.mockResolvedValue(null);

    await expect(
      userService.updateMe(FAKE_USER.id, { name: '새이름' }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('BE-07: user.service.deleteMe', () => {
  it('올바른 비밀번호로 deleteMe 호출 시 withTransaction이 실행된다', async () => {
    mockFindById.mockResolvedValue(FAKE_USER);
    mockComparePassword.mockResolvedValue(true);
    mockDeleteTokensByUserId.mockResolvedValue(undefined);
    mockDeleteTodosByUserId.mockResolvedValue(undefined);
    mockDeleteCategoriesByUserId.mockResolvedValue(undefined);
    mockDeleteUser.mockResolvedValue(undefined);

    await userService.deleteMe(FAKE_USER.id, 'Password1');

    expect(mockWithTransaction).toHaveBeenCalled();
  });

  it('트랜잭션 내 삭제 순서: refresh_tokens → todos → categories → users', async () => {
    mockFindById.mockResolvedValue(FAKE_USER);
    mockComparePassword.mockResolvedValue(true);

    const callOrder: string[] = [];
    mockDeleteTokensByUserId.mockImplementation(async () => { callOrder.push('refreshTokens'); });
    mockDeleteTodosByUserId.mockImplementation(async () => { callOrder.push('todos'); });
    mockDeleteCategoriesByUserId.mockImplementation(async () => { callOrder.push('categories'); });
    mockDeleteUser.mockImplementation(async () => { callOrder.push('users'); });

    await userService.deleteMe(FAKE_USER.id, 'Password1');

    expect(callOrder).toEqual(['refreshTokens', 'todos', 'categories', 'users']);
  });

  it('잘못된 비밀번호로 deleteMe 호출 시 UnauthorizedError를 throw한다', async () => {
    mockFindById.mockResolvedValue(FAKE_USER);
    mockComparePassword.mockResolvedValue(false);

    await expect(userService.deleteMe(FAKE_USER.id, 'WrongPw1')).rejects.toThrow(UnauthorizedError);
  });

  it('존재하지 않는 userId로 deleteMe 시 NotFoundError를 throw한다', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(userService.deleteMe('non-existent', 'Password1')).rejects.toThrow(NotFoundError);
  });

  it('password_hash 없는 사용자가 deleteMe 시도 시 UnauthorizedError를 throw한다', async () => {
    mockFindById.mockResolvedValue({ ...FAKE_USER, password_hash: null });

    await expect(userService.deleteMe(FAKE_USER.id, 'Password1')).rejects.toThrow(UnauthorizedError);
  });

  it('트랜잭션 중 오류 발생 시 withTransaction이 에러를 propagate한다', async () => {
    mockFindById.mockResolvedValue(FAKE_USER);
    mockComparePassword.mockResolvedValue(true);
    mockWithTransaction.mockRejectedValue(new Error('DB error'));

    await expect(userService.deleteMe(FAKE_USER.id, 'Password1')).rejects.toThrow('DB error');
  });
});
