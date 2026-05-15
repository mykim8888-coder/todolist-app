/**
 * BE-08 완료 조건 검증: category.service
 * - getCategories: is_default 카테고리 포함
 * - createCategory: 이름 중복 시 ConflictError
 * - deleteCategory: 기본 카테고리 403(BR-06), 소유권 403(BR-03), todo 재배정 후 삭제(BR-07)
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

jest.mock('../../../src/repositories/category.repository');
jest.mock('../../../src/db/transaction');

import * as categoryRepo from '../../../src/repositories/category.repository';
import * as transaction from '../../../src/db/transaction';
import * as categoryService from '../../../src/services/category.service';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../src/utils/errors';
import { CategoryRow } from '../../../src/types/category.types';
import { PoolClient } from 'pg';

const mockFindAllByUserId = categoryRepo.findAllByUserId as jest.Mock;
const mockFindById = categoryRepo.findById as jest.Mock;
const mockFindByNameAndUserId = categoryRepo.findByNameAndUserId as jest.Mock;
const mockCreate = categoryRepo.create as jest.Mock;
const mockFindDefaultByUserId = categoryRepo.findDefaultByUserId as jest.Mock;
const mockReassignTodos = categoryRepo.reassignTodos as jest.Mock;
const mockDeleteById = categoryRepo.deleteById as jest.Mock;
const mockWithTransaction = transaction.withTransaction as jest.Mock;

const USER_ID = 'user-uuid-123';
const OTHER_USER_ID = 'other-user-uuid';

const DEFAULT_CATEGORY: CategoryRow = {
  id: 'default-cat-id',
  user_id: null,
  name: '일반',
  is_default: true,
  created_at: new Date('2026-01-01'),
};

const USER_CATEGORY: CategoryRow = {
  id: 'user-cat-id',
  user_id: USER_ID,
  name: '내 카테고리',
  is_default: false,
  created_at: new Date('2026-01-01'),
};

const OTHER_USER_CATEGORY: CategoryRow = {
  id: 'other-cat-id',
  user_id: OTHER_USER_ID,
  name: '남의 카테고리',
  is_default: false,
  created_at: new Date('2026-01-01'),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockWithTransaction.mockImplementation(async (cb: (client: PoolClient) => Promise<void>) => {
    return cb({} as PoolClient);
  });
  mockReassignTodos.mockResolvedValue(undefined);
  mockDeleteById.mockResolvedValue(undefined);
});

describe('BE-08: category.service.getCategories', () => {
  it('userId로 카테고리 목록을 반환한다', async () => {
    mockFindAllByUserId.mockResolvedValue([DEFAULT_CATEGORY, USER_CATEGORY]);

    const result = await categoryService.getCategories(USER_ID);

    expect(result).toHaveLength(2);
    expect(mockFindAllByUserId).toHaveBeenCalledWith(USER_ID);
  });

  it('기본 카테고리(is_default: true)가 목록에 포함된다', async () => {
    mockFindAllByUserId.mockResolvedValue([DEFAULT_CATEGORY, USER_CATEGORY]);

    const result = await categoryService.getCategories(USER_ID);

    const defaultCat = result.find((c) => c.isDefault);
    expect(defaultCat).toBeDefined();
    expect(defaultCat?.name).toBe('일반');
  });

  it('반환 객체가 Category 형태로 변환된다', async () => {
    mockFindAllByUserId.mockResolvedValue([USER_CATEGORY]);

    const result = await categoryService.getCategories(USER_ID);

    expect(result[0]).toMatchObject({
      id: USER_CATEGORY.id,
      userId: USER_CATEGORY.user_id,
      name: USER_CATEGORY.name,
      isDefault: USER_CATEGORY.is_default,
    });
    expect(result[0].createdAt).toBeDefined();
  });

  it('카테고리가 없으면 빈 배열을 반환한다', async () => {
    mockFindAllByUserId.mockResolvedValue([]);

    const result = await categoryService.getCategories(USER_ID);

    expect(result).toEqual([]);
  });
});

describe('BE-08: category.service.createCategory', () => {
  it('새 카테고리 생성 시 Category를 반환한다', async () => {
    mockFindByNameAndUserId.mockResolvedValue(null);
    mockCreate.mockResolvedValue(USER_CATEGORY);

    const result = await categoryService.createCategory(USER_ID, '내 카테고리');

    expect(result.name).toBe('내 카테고리');
    expect(mockCreate).toHaveBeenCalledWith(USER_ID, '내 카테고리');
  });

  it('동일 이름의 카테고리가 이미 있으면 ConflictError를 throw한다', async () => {
    mockFindByNameAndUserId.mockResolvedValue(USER_CATEGORY);

    await expect(
      categoryService.createCategory(USER_ID, '내 카테고리'),
    ).rejects.toThrow(ConflictError);
  });

  it('ConflictError의 statusCode가 409이다', async () => {
    mockFindByNameAndUserId.mockResolvedValue(USER_CATEGORY);

    await expect(
      categoryService.createCategory(USER_ID, '내 카테고리'),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('이름 중복 체크 시 findByNameAndUserId가 호출된다', async () => {
    mockFindByNameAndUserId.mockResolvedValue(null);
    mockCreate.mockResolvedValue(USER_CATEGORY);

    await categoryService.createCategory(USER_ID, '새 카테고리');

    expect(mockFindByNameAndUserId).toHaveBeenCalledWith('새 카테고리', USER_ID);
  });
});

describe('BE-08: category.service.deleteCategory', () => {
  it('소유한 카테고리 삭제 시 withTransaction이 호출된다', async () => {
    mockFindById.mockResolvedValue(USER_CATEGORY);
    mockFindDefaultByUserId.mockResolvedValue(DEFAULT_CATEGORY);

    await categoryService.deleteCategory(USER_ID, USER_CATEGORY.id);

    expect(mockWithTransaction).toHaveBeenCalled();
  });

  it('삭제 순서: reassignTodos → deleteById', async () => {
    mockFindById.mockResolvedValue(USER_CATEGORY);
    mockFindDefaultByUserId.mockResolvedValue(DEFAULT_CATEGORY);

    const callOrder: string[] = [];
    mockReassignTodos.mockImplementation(async () => { callOrder.push('reassign'); });
    mockDeleteById.mockImplementation(async () => { callOrder.push('delete'); });

    await categoryService.deleteCategory(USER_ID, USER_CATEGORY.id);

    expect(callOrder).toEqual(['reassign', 'delete']);
  });

  it('reassignTodos가 기본 카테고리 id로 호출된다 (BR-07)', async () => {
    mockFindById.mockResolvedValue(USER_CATEGORY);
    mockFindDefaultByUserId.mockResolvedValue(DEFAULT_CATEGORY);

    await categoryService.deleteCategory(USER_ID, USER_CATEGORY.id);

    expect(mockReassignTodos).toHaveBeenCalledWith(
      expect.anything(),
      USER_CATEGORY.id,
      DEFAULT_CATEGORY.id,
      USER_ID,
    );
  });

  it('기본 카테고리 삭제 시도 시 ForbiddenError를 throw한다 (BR-06)', async () => {
    mockFindById.mockResolvedValue(DEFAULT_CATEGORY);

    await expect(
      categoryService.deleteCategory(USER_ID, DEFAULT_CATEGORY.id),
    ).rejects.toThrow(ForbiddenError);
  });

  it('기본 카테고리 ForbiddenError의 statusCode가 403이다', async () => {
    mockFindById.mockResolvedValue(DEFAULT_CATEGORY);

    await expect(
      categoryService.deleteCategory(USER_ID, DEFAULT_CATEGORY.id),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('타 사용자 카테고리 삭제 시도 시 ForbiddenError를 throw한다 (BR-03)', async () => {
    mockFindById.mockResolvedValue(OTHER_USER_CATEGORY);

    await expect(
      categoryService.deleteCategory(USER_ID, OTHER_USER_CATEGORY.id),
    ).rejects.toThrow(ForbiddenError);
  });

  it('존재하지 않는 카테고리 삭제 시도 시 NotFoundError를 throw한다', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      categoryService.deleteCategory(USER_ID, 'non-existent'),
    ).rejects.toThrow(NotFoundError);
  });

  it('기본 카테고리를 찾을 수 없으면 NotFoundError를 throw한다', async () => {
    mockFindById.mockResolvedValue(USER_CATEGORY);
    mockFindDefaultByUserId.mockResolvedValue(null);

    await expect(
      categoryService.deleteCategory(USER_ID, USER_CATEGORY.id),
    ).rejects.toThrow(NotFoundError);
  });
});
