import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import React from 'react'
import { server } from '../mocks/server'
import { BASE_URL } from '../mocks/handlers'
import { useDeleteTodo } from '@/hooks/useDeleteTodo'
import { useUiStore } from '@/stores/ui.store'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  }
}

describe('useDeleteTodo', () => {
  beforeEach(() => {
    useUiStore.setState({ toastQueue: [] })
  })

  it('성공 시 isSuccess가 true이다', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useDeleteTodo(), { wrapper })
    result.current.mutate('todo-uuid')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('성공 시 todoKeys.all 쿼리를 무효화한다', async () => {
    const { queryClient, wrapper } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteTodo(), { wrapper })
    result.current.mutate('todo-uuid')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['todos'] }),
    )
  })

  it('성공 시 success Toast가 표시된다', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useDeleteTodo(), { wrapper })
    result.current.mutate('todo-uuid')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(useUiStore.getState().toastQueue[0].variant).toBe('success')
  })

  it('실패 시 error Toast가 표시된다', async () => {
    server.use(
      http.delete(`${BASE_URL}/api/todos/:id`, () =>
        HttpResponse.json({ success: false }, { status: 500 }),
      ),
    )
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useDeleteTodo(), { wrapper })
    result.current.mutate('todo-uuid')
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(useUiStore.getState().toastQueue[0].variant).toBe('error')
  })
})
