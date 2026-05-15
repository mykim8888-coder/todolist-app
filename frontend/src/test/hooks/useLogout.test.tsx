import { renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import React from 'react'
import { server } from '../mocks/server'
import { BASE_URL } from '../mocks/handlers'
import { useLogout } from '@/hooks/useLogout'
import { useAuthStore } from '@/stores/auth.store'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('useLogout', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: 'valid-token',
      user: { id: 'u1', email: 'test@test.com', name: 'Test', auth_provider: 'local', created_at: '', updated_at: '' },
      isAuthenticated: true,
    })
  })

  afterEach(() => vi.restoreAllMocks())

  it('로그아웃 성공 시 accessToken이 null로 초기화된다', async () => {
    const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('로그아웃 API 실패 시에도 클라이언트 상태가 초기화된다', async () => {
    server.use(
      http.post(`${BASE_URL}/api/auth/logout`, () => new HttpResponse(null, { status: 500 })),
    )

    const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() })
    result.current.mutate()

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('로그아웃 성공 시 user가 null로 초기화된다', async () => {
    const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(useAuthStore.getState().user).toBeNull()
  })
})
