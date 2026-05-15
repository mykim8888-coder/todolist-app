import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import React from 'react'
import { server } from '../mocks/server'
import { BASE_URL } from '../mocks/handlers'
import { useCreateTodo } from '@/hooks/useCreateTodo'
import { useUiStore } from '@/stores/ui.store'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  }
}

describe('useCreateTodo', () => {
  beforeEach(() => {
    useUiStore.setState({ toastQueue: [] })
  })

  it('성공 시 isSuccess가 true이다', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateTodo(), { wrapper })
    result.current.mutate({
      categoryId: 'cat-uuid',
      title: '새 할일',
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('성공 시 todoKeys.all을 무효화한다', async () => {
    const { queryClient, wrapper } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateTodo(), { wrapper })
    result.current.mutate({
      categoryId: 'cat-uuid',
      title: '새 할일',
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['todos'] }),
    )
  })

  it('실패 시 error Toast가 표시된다', async () => {
    server.use(
      http.post(`${BASE_URL}/api/todos`, () =>
        HttpResponse.json({ success: false }, { status: 500 }),
      ),
    )
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateTodo(), { wrapper })
    result.current.mutate({
      categoryId: 'cat-uuid',
      title: '새 할일',
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(useUiStore.getState().toastQueue[0].variant).toBe('error')
  })

  it('onSuccess 콜백이 호출된다', async () => {
    const onSuccessMock = vi.fn()
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateTodo({ onSuccess: onSuccessMock }), { wrapper })
    result.current.mutate({
      categoryId: 'cat-uuid',
      title: '새 할일',
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onSuccessMock).toHaveBeenCalled()
  })
})