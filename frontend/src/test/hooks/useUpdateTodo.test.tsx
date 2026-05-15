import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import React from 'react'
import { server } from '../mocks/server'
import { BASE_URL, mockTodoRaw } from '../mocks/handlers'
import { useUpdateTodo } from '@/hooks/useUpdateTodo'
import { useUiStore } from '@/stores/ui.store'
import { todoKeys } from '@/api/queryKeys'
import type { Todo } from '@/types/todo.types'

const mockTodo: Todo = {
  id: 'todo-uuid',
  userId: 'user-uuid',
  categoryId: 'cat-uuid',
  title: '테스트 할일',
  description: null,
  startDate: null,
  dueDate: '2026-05-14',
  isCompleted: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  }
}

describe('useUpdateTodo', () => {
  beforeEach(() => {
    useUiStore.setState({ toastQueue: [] })
  })

  it('성공 시 isSuccess가 true이다', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useUpdateTodo(), { wrapper })
    result.current.mutate({ id: 'todo-uuid', body: { is_completed: true } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('Optimistic Update: 서버 응답 전에 캐시를 즉시 업데이트한다', async () => {
    const { queryClient, wrapper } = createWrapper()
    const filter = {}
    const queryKey = todoKeys.list(filter)
    queryClient.setQueryData<Todo[]>(queryKey, [mockTodo])

    let resolveResponse: () => void
    const responsePromise = new Promise<void>((res) => { resolveResponse = res })

    server.use(
      http.patch(`${BASE_URL}/api/todos/:id`, async () => {
        await responsePromise
        return HttpResponse.json({ success: true, data: { ...mockTodoRaw, is_completed: true } })
      }),
    )

    const { result } = renderHook(() => useUpdateTodo(), { wrapper })

    act(() => {
      result.current.mutate({ id: 'todo-uuid', body: { is_completed: true }, filter })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<Todo[]>(queryKey)
      expect(cached![0].isCompleted).toBe(true)
    })

    resolveResponse!()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('실패 시 이전 캐시로 롤백한다', async () => {
    const { queryClient, wrapper } = createWrapper()
    const filter = {}
    const queryKey = todoKeys.list(filter)
    queryClient.setQueryData<Todo[]>(queryKey, [mockTodo])

    server.use(
      http.patch(`${BASE_URL}/api/todos/:id`, () =>
        HttpResponse.json({ success: false }, { status: 500 }),
      ),
    )

    const { result } = renderHook(() => useUpdateTodo(), { wrapper })
    result.current.mutate({ id: 'todo-uuid', body: { is_completed: true }, filter })

    await waitFor(() => expect(result.current.isError).toBe(true))

    const cached = queryClient.getQueryData<Todo[]>(queryKey)
    expect(cached![0].isCompleted).toBe(false)
  })

  it('실패 시 error Toast가 표시된다', async () => {
    server.use(
      http.patch(`${BASE_URL}/api/todos/:id`, () =>
        HttpResponse.json({ success: false }, { status: 500 }),
      ),
    )
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useUpdateTodo(), { wrapper })
    result.current.mutate({ id: 'todo-uuid', body: { is_completed: true } })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(useUiStore.getState().toastQueue[0].variant).toBe('error')
  })

  it('onSettled 시 todoKeys.all을 무효화한다', async () => {
    const { queryClient, wrapper } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateTodo(), { wrapper })
    result.current.mutate({ id: 'todo-uuid', body: { is_completed: true } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['todos'] }),
    )
  })
})
