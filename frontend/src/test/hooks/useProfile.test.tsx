import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import React from 'react'
import { server } from '../mocks/server'
import { BASE_URL, mockUser } from '../mocks/handlers'
import { useProfile } from '@/hooks/useProfile'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useProfile', () => {
  beforeEach(() => {})

  it('사용자 정보를 성공적으로 조회한다', async () => {
    const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockUser)
  })

  it('초기 상태는 로딩 중이다', () => {
    const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() })

    expect(result.current.isLoading).toBe(true)
  })

  it('API 오류 시 error 상태가 된다', async () => {
    server.use(
      http.get(`${BASE_URL}/api/users/me`, () =>
        HttpResponse.json({ success: false }, { status: 500 }),
      ),
    )

    const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it("쿼리 키가 ['users', 'me']이다", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useProfile(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const cached = queryClient.getQueryData(['users', 'me'])
    expect(cached).toEqual(mockUser)
  })
})
