import { renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import React from 'react'
import { server } from '../mocks/server'
import { BASE_URL, mockUser } from '../mocks/handlers'
import { useLogin } from '@/hooks/useLogin'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

function resetStores() {
  useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  useUiStore.setState({ toastQueue: [] })
}

describe('useLogin', () => {
  beforeEach(() => resetStores())
  afterEach(() => vi.restoreAllMocks())

  it('로그인 성공 시 auth.store에 accessToken과 user가 저장된다', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() })

    result.current.mutate({ email: 'test@test.com', password: 'password123' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(useAuthStore.getState().accessToken).toBe('mock-access-token')
    expect(useAuthStore.getState().user).toEqual(mockUser)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('로그인 실패 시 error Toast가 표시된다', async () => {
    server.use(
      http.post(`${BASE_URL}/api/auth/login`, () =>
        HttpResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: '이메일 또는 비밀번호가 올바르지 않습니다.' } },
          { status: 401 },
        ),
      ),
    )

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() })
    result.current.mutate({ email: 'wrong@test.com', password: 'wrongpassword' })

    await waitFor(() => expect(result.current.isError).toBe(true))

    const toastQueue = useUiStore.getState().toastQueue
    expect(toastQueue.length).toBeGreaterThan(0)
    expect(toastQueue[0].variant).toBe('error')
  })

  it('401 응답 시 에러 메시지가 Toast에 표시된다', async () => {
    server.use(
      http.post(`${BASE_URL}/api/auth/login`, () =>
        HttpResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: '이메일 또는 비밀번호가 올바르지 않습니다.' } },
          { status: 401 },
        ),
      ),
    )

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() })
    result.current.mutate({ email: 'test@test.com', password: 'wrongpassword' })

    await waitFor(() => expect(result.current.isError).toBe(true))

    const toastQueue = useUiStore.getState().toastQueue
    expect(toastQueue[0].message).toBe('이메일 또는 비밀번호가 올바르지 않습니다.')
  })

  it('로그인 중 isPending이 true이다', async () => {
    let resolveFn!: () => void
    server.use(
      http.post(`${BASE_URL}/api/auth/login`, () =>
        new Promise((resolve) => {
          resolveFn = () =>
            resolve(HttpResponse.json({ success: true, data: { accessToken: 'tok', user: mockUser } }))
        }),
      ),
    )

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() })
    result.current.mutate({ email: 'test@test.com', password: 'password123' })

    await waitFor(() => expect(result.current.isPending).toBe(true))
    resolveFn()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})
