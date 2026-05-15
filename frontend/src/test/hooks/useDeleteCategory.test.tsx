import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import React from 'react'
import { server } from '../mocks/server'
import { BASE_URL } from '../mocks/handlers'
import { useDeleteCategory } from '@/hooks/useDeleteCategory'
import { useUiStore } from '@/stores/ui.store'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return { queryClient, wrapper: ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )}
}

describe('useDeleteCategory', () => {
  beforeEach(() => {
    useUiStore.setState({ toastQueue: [] })
  })

  it('성공 시 isSuccess가 true이다', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useDeleteCategory(), { wrapper })
    result.current.mutate('cat-uuid')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('성공 시 categoryKeys.all 쿼리를 무효화한다', async () => {
    const { queryClient, wrapper } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteCategory(), { wrapper })
    result.current.mutate('cat-uuid')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['categories'] }),
    )
  })

  it('성공 시 todoKeys.all 쿼리도 무효화한다', async () => {
    const { queryClient, wrapper } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteCategory(), { wrapper })
    result.current.mutate('cat-uuid')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['todos'] }),
    )
  })

  it('실패 시 error Toast가 표시된다', async () => {
    server.use(
      http.delete(`${BASE_URL}/api/categories/:id`, () =>
        HttpResponse.json(
          { success: false, error: { code: 'SERVER_ERROR', message: '삭제에 실패했습니다.' } },
          { status: 500 },
        ),
      ),
    )
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useDeleteCategory(), { wrapper })
    result.current.mutate('cat-uuid')
    await waitFor(() => expect(result.current.isError).toBe(true))
    const toastQueue = useUiStore.getState().toastQueue
    expect(toastQueue[0].variant).toBe('error')
  })
})
