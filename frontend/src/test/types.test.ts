import { describe, it, expectTypeOf } from 'vitest';
import type { ApiResponse, ApiError } from '../types/api.types';
import type { User, UpdateProfileRequest, DeleteAccountRequest } from '../types/user.types';
import type { LoginRequest, LoginResponse, SignupRequest, RefreshResponse } from '../types/auth.types';
import type { Category, CreateCategoryRequest } from '../types/category.types';
import type { Todo, TodoFilter, CreateTodoRequest, UpdateTodoRequest } from '../types/todo.types';

describe('api.types', () => {
  it('ApiResponse wraps data correctly', () => {
    const res: ApiResponse<User> = {
      success: true,
      data: {
        id: 'uuid',
        email: 'test@test.com',
        name: 'Test',
        auth_provider: 'local',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    };
    expectTypeOf(res.success).toEqualTypeOf<true>();
    expectTypeOf(res.data).toEqualTypeOf<User>();
  });

  it('ApiError has error.code and error.message', () => {
    const err: ApiError = {
      success: false,
      error: { code: 'NOT_FOUND', message: '없음' },
    };
    expectTypeOf(err.success).toEqualTypeOf<false>();
    expectTypeOf(err.error.code).toEqualTypeOf<string>();
  });
});

describe('user.types', () => {
  it('User has required fields', () => {
    const user: User = {
      id: 'uuid',
      email: null,
      name: 'Test',
      auth_provider: 'local',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
    expectTypeOf(user.email).toEqualTypeOf<string | null>();
    expectTypeOf(user.auth_provider).toEqualTypeOf<'local' | 'google' | 'facebook'>();
  });

  it('UpdateProfileRequest has optional fields', () => {
    const req: UpdateProfileRequest = {};
    expectTypeOf(req.name).toEqualTypeOf<string | undefined>();
    expectTypeOf(req.currentPassword).toEqualTypeOf<string | undefined>();
    expectTypeOf(req.newPassword).toEqualTypeOf<string | undefined>();
  });

  it('DeleteAccountRequest requires password', () => {
    const req: DeleteAccountRequest = { password: 'pw123456' };
    expectTypeOf(req.password).toEqualTypeOf<string>();
  });
});

describe('auth.types', () => {
  it('LoginRequest has email and password', () => {
    const req: LoginRequest = { email: 'a@b.com', password: 'pw123456' };
    expectTypeOf(req.email).toEqualTypeOf<string>();
    expectTypeOf(req.password).toEqualTypeOf<string>();
  });

  it('LoginResponse has accessToken and user', () => {
    const res: LoginResponse = {
      accessToken: 'token',
      user: {
        id: 'uuid',
        email: 'a@b.com',
        name: 'Test',
        auth_provider: 'local',
        created_at: '',
        updated_at: '',
      },
    };
    expectTypeOf(res.accessToken).toEqualTypeOf<string>();
    expectTypeOf(res.user).toEqualTypeOf<User>();
  });

  it('SignupRequest has email, password, name', () => {
    const req: SignupRequest = { email: 'a@b.com', password: 'pw123456', name: 'Test' };
    expectTypeOf(req.name).toEqualTypeOf<string>();
  });

  it('RefreshResponse has accessToken', () => {
    const res: RefreshResponse = { accessToken: 'new-token' };
    expectTypeOf(res.accessToken).toEqualTypeOf<string>();
  });
});

describe('category.types', () => {
  it('Category.isDefault is boolean', () => {
    const cat: Category = {
      id: 'uuid',
      userId: null,
      name: '일반',
      isDefault: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    expectTypeOf(cat.isDefault).toEqualTypeOf<boolean>();
    expectTypeOf(cat.userId).toEqualTypeOf<string | null>();
  });

  it('CreateCategoryRequest has name', () => {
    const req: CreateCategoryRequest = { name: '업무' };
    expectTypeOf(req.name).toEqualTypeOf<string>();
  });
});

describe('todo.types', () => {
  it('Todo.dueDate is string | null', () => {
    const todo: Todo = {
      id: 'uuid',
      userId: 'user-uuid',
      categoryId: 'cat-uuid',
      title: '할일',
      description: null,
      startDate: null,
      dueDate: null,
      isCompleted: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    expectTypeOf(todo.dueDate).toEqualTypeOf<string | null>();
    expectTypeOf(todo.isCompleted).toEqualTypeOf<boolean>();
    expectTypeOf(todo.description).toEqualTypeOf<string | null>();
  });

  it('TodoFilter has optional camelCase fields', () => {
    const filter: TodoFilter = { categoryId: 'uuid', isCompleted: false, overdue: true };
    expectTypeOf(filter.categoryId).toEqualTypeOf<string | undefined>();
    expectTypeOf(filter.isCompleted).toEqualTypeOf<boolean | undefined>();
    expectTypeOf(filter.overdue).toEqualTypeOf<boolean | undefined>();
  });

  it('CreateTodoRequest has mixed naming convention', () => {
    const req: CreateTodoRequest = {
      categoryId: 'cat-uuid',
      title: '새 할일',
    };
    expectTypeOf(req.categoryId).toEqualTypeOf<string>();
    expectTypeOf(req.start_date).toEqualTypeOf<string | undefined>();
    expectTypeOf(req.due_date).toEqualTypeOf<string | undefined>();
  });

  it('UpdateTodoRequest supports null for optional date fields', () => {
    const req: UpdateTodoRequest = {
      is_completed: true,
      due_date: null,
    };
    expectTypeOf(req.due_date).toEqualTypeOf<string | null | undefined>();
    expectTypeOf(req.is_completed).toEqualTypeOf<boolean | undefined>();
  });
});
