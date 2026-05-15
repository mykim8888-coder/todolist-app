import { http, HttpResponse } from 'msw'

export const BASE_URL = 'http://localhost:3000'

export const mockUser = {
  id: 'user-uuid',
  email: 'test@test.com',
  name: 'Test User',
  auth_provider: 'local' as const,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

export const mockTodoRaw = {
  id: 'todo-uuid',
  user_id: 'user-uuid',
  category_id: 'cat-uuid',
  title: '테스트 할일',
  description: null,
  start_date: null,
  due_date: '2026-05-14',
  is_completed: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

export const mockCategoryRaw = {
  id: 'cat-uuid',
  user_id: null,
  name: '일반',
  is_default: true,
  created_at: '2026-01-01T00:00:00.000Z',
}

export const handlers = [
  http.post(`${BASE_URL}/api/auth/login`, () =>
    HttpResponse.json({
      success: true,
      data: { accessToken: 'mock-access-token', user: mockUser },
    }),
  ),

  http.post(`${BASE_URL}/api/auth/signup`, () =>
    HttpResponse.json({ success: true, data: mockUser }, { status: 201 }),
  ),

  http.post(`${BASE_URL}/api/auth/logout`, () =>
    HttpResponse.json({ success: true, data: null }),
  ),

  http.post(`${BASE_URL}/api/auth/refresh`, () =>
    HttpResponse.json({ success: true, data: { accessToken: 'new-access-token' } }),
  ),

  http.get(`${BASE_URL}/api/users/me`, () =>
    HttpResponse.json({ success: true, data: mockUser }),
  ),

  http.patch(`${BASE_URL}/api/users/me`, () =>
    HttpResponse.json({ success: true, data: mockUser }),
  ),

  http.delete(`${BASE_URL}/api/users/me`, () =>
    HttpResponse.json({ success: true, data: null }),
  ),

  http.get(`${BASE_URL}/api/todos`, () =>
    HttpResponse.json({ success: true, data: [mockTodoRaw] }),
  ),

  http.post(`${BASE_URL}/api/todos`, () =>
    HttpResponse.json({ success: true, data: mockTodoRaw }, { status: 201 }),
  ),

  http.get(`${BASE_URL}/api/todos/:id`, () =>
    HttpResponse.json({ success: true, data: mockTodoRaw }),
  ),

  http.patch(`${BASE_URL}/api/todos/:id`, () =>
    HttpResponse.json({ success: true, data: mockTodoRaw }),
  ),

  http.delete(`${BASE_URL}/api/todos/:id`, () =>
    HttpResponse.json({ success: true, data: null }),
  ),

  http.get(`${BASE_URL}/api/categories`, () =>
    HttpResponse.json({ success: true, data: [mockCategoryRaw] }),
  ),

  http.post(`${BASE_URL}/api/categories`, () =>
    HttpResponse.json({ success: true, data: mockCategoryRaw }, { status: 201 }),
  ),

  http.delete(`${BASE_URL}/api/categories/:id`, () =>
    HttpResponse.json({ success: true, data: null }),
  ),
]
