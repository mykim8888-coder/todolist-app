import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import React from 'react'
import { useTodos } from '@/hooks/useTodos'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  }
}

describe('useTodos', () => {
  it('할일 목록을 정상적으로 조회한다', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useTodos(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0].title).toBe('테스트 할일')
  })

  it('filter를 쿼리키에 포함한다', async () => {
    const { queryClient, wrapper } = createWrapper()
    const filter = { categoryId: 'cat-uuid' }
    const { result } = renderHook(() => useTodos(filter), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const cached = queryClient.getQueryData(['todos', 'list', filter])
    expect(cached).toBeDefined()
  })

  it('빈 필터로 조회해도 정상 동작한다', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useTodos({}), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeDefined()
  })
})
