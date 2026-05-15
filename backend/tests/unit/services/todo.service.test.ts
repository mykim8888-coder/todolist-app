/**
 * BE-09 완료 조건 검증: todo.service
 * - getTodos: 필터 조회(BR-08)
 * - createTodo: 카테고리 소유권/존재(BR-04), 날짜 유효성(BR-05)
 * - updateTodo: 소유권(BR-03), 날짜 유효성(BR-05)
 * - deleteTodo: 소유권(BR-03)
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

jest.mock('../../../src/repositories/todo.repository');
jest.mock('../../../src/repositories/category.repository');

import * as todoRepo from '../../../src/repositories/todo.repository';
import * as categoryRepo from '../../../src/repositories/category.repository';
import * as todoService from '../../../src/services/todo.service';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../src/utils/errors';
import { TodoRow } from '../../../src/types/todo.types';
import { CategoryRow } from '../../../src/types/category.types';

const mockFindAll = todoRepo.findAll as jest.Mock;
const mockFindById = todoRepo.findById as jest.Mock;
const mockCreate = todoRepo.create as jest.Mock;
const mockUpdate = todoRepo.update as jest.Mock;
const mockDeleteById = todoRepo.deleteById as jest.Mock;
const mockCategoryFindById = categoryRepo.findById as jest.Mock;

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

const OTHER_CATEGORY: CategoryRow = {
  id: 'other-cat-id',
  user_id: OTHER_USER_ID,
  name: '타인 카테고리',
  is_default: false,
  created_at: new Date('2026-01-01'),
};

const FAKE_TODO_ROW: TodoRow = {
  id: 'todo-uuid-001',
  user_id: USER_ID,
  category_id: USER_CATEGORY.id,
  title: '테스트 할일',
  description: null,
  start_date: null,
  due_date: null,
  is_completed: false,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

const OTHER_TODO_ROW: TodoRow = {
  ...FAKE_TODO_ROW,
  id: 'other-todo-id',
  user_id: OTHER_USER_ID,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BE-09: todo.service.getTodos', () => {
  it('userId와 빈 필터로 조회 시 Todo 목록을 반환한다', async () => {
    mockFindAll.mockResolvedValue([FAKE_TODO_ROW]);

    const result = await todoService.getTodos(USER_ID, {});

    expect(result).toHaveLength(1);
    expect(mockFindAll).toHaveBeenCalledWith(USER_ID, {});
  });

  it('반환 객체가 Todo 형태로 변환된다 (snake_case → camelCase)', async () => {
    mockFindAll.mockResolvedValue([FAKE_TODO_ROW]);

    const result = await todoService.getTodos(USER_ID, {});

    expect(result[0]).toMatchObject({
      id: FAKE_TODO_ROW.id,
      userId: FAKE_TODO_ROW.user_id,
      categoryId: FAKE_TODO_ROW.category_id,
      title: FAKE_TODO_ROW.title,
      isCompleted: FAKE_TODO_ROW.is_completed,
    });
    expect(result[0]).not.toHaveProperty('user_id');
  });

  it('is_completed 필터가 전달된다 (BR-08)', async () => {
    mockFindAll.mockResolvedValue([]);

    await todoService.getTodos(USER_ID, { isCompleted: false });

    expect(mockFindAll).toHaveBeenCalledWith(USER_ID, { isCompleted: false });
  });

  it('expired 필터가 전달된다 (BR-08)', async () => {
    mockFindAll.mockResolvedValue([]);

    await todoService.getTodos(USER_ID, { expired: true });

    expect(mockFindAll).toHaveBeenCalledWith(USER_ID, { expired: true });
  });

  it('복합 필터(is_completed=false, expired=true)가 전달된다', async () => {
    mockFindAll.mockResolvedValue([]);

    await todoService.getTodos(USER_ID, { isCompleted: false, expired: true });

    expect(mockFindAll).toHaveBeenCalledWith(USER_ID, { isCompleted: false, expired: true });
  });
});

describe('BE-09: todo.service.getTodo', () => {
  it('본인 소유 할일 조회 시 Todo를 반환한다', async () => {
    mockFindById.mockResolvedValue(FAKE_TODO_ROW);

    const result = await todoService.getTodo(USER_ID, FAKE_TODO_ROW.id);

    expect(result.id).toBe(FAKE_TODO_ROW.id);
  });

  it('존재하지 않는 할일 조회 시 NotFoundError를 throw한다', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(todoService.getTodo(USER_ID, 'non-existent')).rejects.toThrow(NotFoundError);
  });

  it('타 사용자 할일 조회 시 ForbiddenError를 throw한다', async () => {
    mockFindById.mockResolvedValue(OTHER_TODO_ROW);

    await expect(todoService.getTodo(USER_ID, OTHER_TODO_ROW.id)).rejects.toThrow(ForbiddenError);
  });
});

describe('BE-09: todo.service.createTodo', () => {
  it('유효한 데이터로 할일 생성 시 Todo를 반환한다', async () => {
    mockCategoryFindById.mockResolvedValue(USER_CATEGORY);
    mockCreate.mockResolvedValue(FAKE_TODO_ROW);

    const result = await todoService.createTodo(USER_ID, {
      title: '테스트 할일',
      categoryId: USER_CATEGORY.id,
    });

    expect(result.title).toBe('테스트 할일');
  });

  it('기본 카테고리(is_default=true)로 할일 생성 가능하다 (BR-04)', async () => {
    mockCategoryFindById.mockResolvedValue(DEFAULT_CATEGORY);
    mockCreate.mockResolvedValue(FAKE_TODO_ROW);

    await expect(
      todoService.createTodo(USER_ID, { title: '할일', categoryId: DEFAULT_CATEGORY.id }),
    ).resolves.toBeDefined();
  });

  it('타 사용자 카테고리로 할일 생성 시 ForbiddenError를 throw한다 (BR-04)', async () => {
    mockCategoryFindById.mockResolvedValue(OTHER_CATEGORY);

    await expect(
      todoService.createTodo(USER_ID, { title: '할일', categoryId: OTHER_CATEGORY.id }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('존재하지 않는 카테고리로 할일 생성 시 NotFoundError를 throw한다 (BR-04)', async () => {
    mockCategoryFindById.mockResolvedValue(null);

    await expect(
      todoService.createTodo(USER_ID, { title: '할일', categoryId: 'non-existent' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('dueDate < startDate인 경우 ValidationError를 throw한다 (BR-05)', async () => {
    mockCategoryFindById.mockResolvedValue(USER_CATEGORY);

    await expect(
      todoService.createTodo(USER_ID, {
        title: '할일',
        categoryId: USER_CATEGORY.id,
        startDate: '2026-12-31',
        dueDate: '2026-01-01',
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('ValidationError의 statusCode가 422이다 (BR-05)', async () => {
    mockCategoryFindById.mockResolvedValue(USER_CATEGORY);

    await expect(
      todoService.createTodo(USER_ID, {
        title: '할일',
        categoryId: USER_CATEGORY.id,
        startDate: '2026-12-31',
        dueDate: '2026-01-01',
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('startDate만 있으면 날짜 검증을 통과한다', async () => {
    mockCategoryFindById.mockResolvedValue(USER_CATEGORY);
    mockCreate.mockResolvedValue(FAKE_TODO_ROW);

    await expect(
      todoService.createTodo(USER_ID, {
        title: '할일',
        categoryId: USER_CATEGORY.id,
        startDate: '2026-01-01',
      }),
    ).resolves.toBeDefined();
  });

  it('dueDate === startDate인 경우 통과한다 (BR-05)', async () => {
    mockCategoryFindById.mockResolvedValue(USER_CATEGORY);
    mockCreate.mockResolvedValue(FAKE_TODO_ROW);

    await expect(
      todoService.createTodo(USER_ID, {
        title: '할일',
        categoryId: USER_CATEGORY.id,
        startDate: '2026-05-01',
        dueDate: '2026-05-01',
      }),
    ).resolves.toBeDefined();
  });
});

describe('BE-09: todo.service.updateTodo', () => {
  it('본인 소유 할일 수정 시 업데이트된 Todo를 반환한다', async () => {
    const updatedRow = { ...FAKE_TODO_ROW, title: '수정된 할일' };
    mockFindById.mockResolvedValue(FAKE_TODO_ROW);
    mockUpdate.mockResolvedValue(updatedRow);

    const result = await todoService.updateTodo(USER_ID, FAKE_TODO_ROW.id, { title: '수정된 할일' });

    expect(result.title).toBe('수정된 할일');
  });

  it('타 사용자 할일 수정 시도 시 ForbiddenError를 throw한다 (BR-03)', async () => {
    mockFindById.mockResolvedValue(OTHER_TODO_ROW);

    await expect(
      todoService.updateTodo(USER_ID, OTHER_TODO_ROW.id, { title: '수정' }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('존재하지 않는 할일 수정 시도 시 NotFoundError를 throw한다', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      todoService.updateTodo(USER_ID, 'non-existent', { title: '수정' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('카테고리 변경 시 소유권 검증을 한다 (BR-04)', async () => {
    mockFindById.mockResolvedValue(FAKE_TODO_ROW);
    mockCategoryFindById.mockResolvedValue(OTHER_CATEGORY);

    await expect(
      todoService.updateTodo(USER_ID, FAKE_TODO_ROW.id, { categoryId: OTHER_CATEGORY.id }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('날짜 역전 시 ValidationError를 throw한다 (BR-05)', async () => {
    mockFindById.mockResolvedValue(FAKE_TODO_ROW);

    await expect(
      todoService.updateTodo(USER_ID, FAKE_TODO_ROW.id, {
        startDate: '2026-12-31',
        dueDate: '2026-01-01',
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('기존 startDate와 새 dueDate의 유효성을 함께 검증한다', async () => {
    const rowWithStart = { ...FAKE_TODO_ROW, start_date: '2026-06-01' };
    mockFindById.mockResolvedValue(rowWithStart);

    await expect(
      todoService.updateTodo(USER_ID, rowWithStart.id, { dueDate: '2026-01-01' }),
    ).rejects.toThrow(ValidationError);
  });

  it('update가 null을 반환하면 NotFoundError를 throw한다 (방어 코드)', async () => {
    mockFindById.mockResolvedValue(FAKE_TODO_ROW);
    mockUpdate.mockResolvedValue(null);

    await expect(
      todoService.updateTodo(USER_ID, FAKE_TODO_ROW.id, { title: '수정' }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('BE-09: todo.service.deleteTodo', () => {
  it('본인 소유 할일 삭제 시 deleteById가 호출된다', async () => {
    mockFindById.mockResolvedValue(FAKE_TODO_ROW);
    mockDeleteById.mockResolvedValue(undefined);

    await todoService.deleteTodo(USER_ID, FAKE_TODO_ROW.id);

    expect(mockDeleteById).toHaveBeenCalledWith(FAKE_TODO_ROW.id);
  });

  it('타 사용자 할일 삭제 시도 시 ForbiddenError를 throw한다 (BR-03)', async () => {
    mockFindById.mockResolvedValue(OTHER_TODO_ROW);

    await expect(
      todoService.deleteTodo(USER_ID, OTHER_TODO_ROW.id),
    ).rejects.toThrow(ForbiddenError);
  });

  it('ForbiddenError의 statusCode가 403이다 (BR-03)', async () => {
    mockFindById.mockResolvedValue(OTHER_TODO_ROW);

    await expect(
      todoService.deleteTodo(USER_ID, OTHER_TODO_ROW.id),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('존재하지 않는 할일 삭제 시도 시 NotFoundError를 throw한다', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      todoService.deleteTodo(USER_ID, 'non-existent'),
    ).rejects.toThrow(NotFoundError);
  });
});
