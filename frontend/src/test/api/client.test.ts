import { describe, it, expect, vi, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { BASE_URL, mockUser } from '../mocks/handlers'
import apiClient, { resetRefreshState, _nav } from '@/api/client'
import { useAuthStore } from '@/stores/auth.store'

function resetStore() {
  useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
}

beforeEach(() => {
  resetStore()
  resetRefreshState()
})

describe('Request Interceptor - Authorization header', () => {
  it('does NOT inject Authorization header when no access token', async () => {
    let capturedAuth: string | null = null

    server.use(
      http.get(`${BASE_URL}/api/users/me`, ({ request }) => {
        capturedAuth = request.headers.get('authorization')
        return HttpResponse.json({ success: true, data: mockUser })
      }),
    )

    await apiClient.get('/api/users/me')
    expect(capturedAuth).toBeNull()
  })

  it('injects Authorization Bearer header when access token exists', async () => {
    useAuthStore.getState().setAccessToken('my-token')
    let capturedAuth = ''

    server.use(
      http.get(`${BASE_URL}/api/users/me`, ({ request }) => {
        capturedAuth = request.headers.get('authorization') ?? ''
        return HttpResponse.json({ success: true, data: mockUser })
      }),
    )

    await apiClient.get('/api/users/me')
    expect(capturedAuth).toBe('Bearer my-token')
  })
})

describe('Response Interceptor - 401 auto-refresh', () => {
  it('refreshes token and retries original request on 401', async () => {
    useAuthStore.getState().setAccessToken('expired-token')
    let callCount = 0

    server.use(
      http.get(`${BASE_URL}/api/users/me`, () => {
        callCount++
        if (callCount === 1) return new HttpResponse(null, { status: 401 })
        return HttpResponse.json({ success: true, data: mockUser })
      }),
      http.post(`${BASE_URL}/api/auth/refresh`, () =>
        HttpResponse.json({ success: true, data: { accessToken: 'refreshed-token' } }),
      ),
    )

    const res = await apiClient.get('/api/users/me')
    expect(res.status).toBe(200)
    expect(callCount).toBe(2)
    expect(useAuthStore.getState().accessToken).toBe('refreshed-token')
  })

  it('clears auth and redirects to /login when refresh fails', async () => {
    useAuthStore.getState().setAuth('expired-token', mockUser)
    const redirectSpy = vi.spyOn(_nav, 'redirectToLogin').mockImplementation(() => {})

    server.use(
      http.get(`${BASE_URL}/api/users/me`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${BASE_URL}/api/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
    )

    await expect(apiClient.get('/api/users/me')).rejects.toBeDefined()
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(redirectSpy).toHaveBeenCalledOnce()

    redirectSpy.mockRestore()
  })

  it('does not retry again if _retried is already set', async () => {
    let refreshCount = 0

    server.use(
      http.get(`${BASE_URL}/api/users/me`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${BASE_URL}/api/auth/refresh`, () => {
        refreshCount++
        return HttpResponse.json({ success: true, data: { accessToken: 'new-token' } })
      }),
    )

    // First call triggers refresh + retry; retry still gets 401 → should NOT trigger another refresh
    await expect(apiClient.get('/api/users/me')).rejects.toBeDefined()
    expect(refreshCount).toBe(1)
  })
})

describe('Concurrent 401 - refresh called only once', () => {
  it('fires refresh exactly once for 3 simultaneous 401s', async () => {
    useAuthStore.getState().setAccessToken('expired-token')
    let refreshCount = 0
    const callCounts = { todos: 0, categories: 0, users: 0 }

    server.use(
      http.get(`${BASE_URL}/api/todos`, async () => {
        callCounts.todos++
        if (callCounts.todos === 1) return new HttpResponse(null, { status: 401 })
        return HttpResponse.json({ success: true, data: [] })
      }),
      http.get(`${BASE_URL}/api/categories`, async () => {
        callCounts.categories++
        if (callCounts.categories === 1) return new HttpResponse(null, { status: 401 })
        return HttpResponse.json({ success: true, data: [] })
      }),
      http.get(`${BASE_URL}/api/users/me`, async () => {
        callCounts.users++
        if (callCounts.users === 1) return new HttpResponse(null, { status: 401 })
        return HttpResponse.json({ success: true, data: mockUser })
      }),
      http.post(`${BASE_URL}/api/auth/refresh`, async () => {
        refreshCount++
        // Small delay to ensure queued requests see isRefreshing = true
        await new Promise((r) => setTimeout(r, 20))
        return HttpResponse.json({ success: true, data: { accessToken: 'refreshed-token' } })
      }),
    )

    const results = await Promise.allSettled([
      apiClient.get('/api/todos'),
      apiClient.get('/api/categories'),
      apiClient.get('/api/users/me'),
    ])

    expect(refreshCount).toBe(1)
    results.forEach((r) => expect(r.status).toBe('fulfilled'))
  })
})

describe('API modules', () => {
  it('login returns accessToken and user', async () => {
    const { login } = await import('@/api/auth.api')
    const result = await login({ email: 'test@test.com', password: 'pw123456' })
    expect(result.accessToken).toBe('mock-access-token')
    expect(result.user.name).toBe('Test User')
  })

  it('getMe returns user data', async () => {
    const { getMe } = await import('@/api/user.api')
    const user = await getMe()
    expect(user.id).toBe('user-uuid')
    expect(user.email).toBe('test@test.com')
  })

  it('getCategories returns mapped camelCase Category array', async () => {
    const { getCategories } = await import('@/api/category.api')
    const categories = await getCategories()
    expect(categories[0].isDefault).toBe(true)
    expect(categories[0].userId).toBeNull()
    expect(categories[0].createdAt).toBeDefined()
  })

  it('getTodos returns mapped camelCase Todo array', async () => {
    const { getTodos } = await import('@/api/todo.api')
    const todos = await getTodos()
    expect(todos[0].isCompleted).toBe(false)
    expect(todos[0].dueDate).toBe('2026-05-14')
    expect(todos[0].categoryId).toBe('cat-uuid')
    expect(todos[0].userId).toBe('user-uuid')
  })
})
