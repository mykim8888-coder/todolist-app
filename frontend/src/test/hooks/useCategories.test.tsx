import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import React from 'react'
import { server } from '../mocks/server'
import { BASE_URL } from '../mocks/handlers'
import { useCategories } from '@/hooks/useCategories'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useCategories', () => {
  it('초기에 isLoading이 true이다', () => {
    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() })
    expect(result.current.isLoading).toBe(true)
  })

  it('성공 시 categories 배열을 반환한다', async () => {
    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0].name).toBe('일반')
    expect(result.current.data?.[0].isDefault).toBe(true)
  })

  it('API 에러 시 isError가 true이다', async () => {
    server.use(
      http.get(`${BASE_URL}/api/categories`, () => new HttpResponse(null, { status: 500 })),
    )
    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('mapCategory를 통해 camelCase 변환된 데이터를 반환한다', async () => {
    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const category = result.current.data?.[0]
    expect(category).toHaveProperty('isDefault')
    expect(category).toHaveProperty('createdAt')
    expect(category).toHaveProperty('userId')
  })
})
