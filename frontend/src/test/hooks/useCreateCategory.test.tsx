import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import React from 'react'
import { server } from '../mocks/server'
import { BASE_URL } from '../mocks/handlers'
import { useCreateCategory } from '@/hooks/useCreateCategory'
import { useUiStore } from '@/stores/ui.store'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return { queryClient, wrapper: ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )}
}

describe('useCreateCategory', () => {
  beforeEach(() => {
    useUiStore.setState({ toastQueue: [] })
  })

  it('성공 시 isSuccess가 true이다', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateCategory(), { wrapper })
    result.current.mutate({ name: '새 카테고리' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('성공 시 categoryKeys.all 쿼리를 무효화한다', async () => {
    const { queryClient, wrapper } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateCategory(), { wrapper })
    result.current.mutate({ name: '새 카테고리' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['categories'] }),
    )
  })

  it('409 응답 시 "이미 사용 중인 카테고리 이름입니다" Toast가 표시된다', async () => {
    server.use(
      http.post(`${BASE_URL}/api/categories`, () =>
        HttpResponse.json(
          { success: false, error: { code: 'CONFLICT', message: '중복된 카테고리 이름' } },
          { status: 409 },
        ),
      ),
    )
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateCategory(), { wrapper })
    result.current.mutate({ name: '일반' })
    await waitFor(() => expect(result.current.isError).toBe(true))
    const toastQueue = useUiStore.getState().toastQueue
    expect(toastQueue[0].message).toBe('이미 사용 중인 카테고리 이름입니다.')
    expect(toastQueue[0].variant).toBe('error')
  })

  it('기타 에러 응답 시 서버 메시지 Toast가 표시된다', async () => {
    server.use(
      http.post(`${BASE_URL}/api/categories`, () =>
        HttpResponse.json(
          { success: false, error: { code: 'SERVER_ERROR', message: '서버 오류가 발생했습니다.' } },
          { status: 500 },
        ),
      ),
    )
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateCategory(), { wrapper })
    result.current.mutate({ name: '카테고리' })
    await waitFor(() => expect(result.current.isError).toBe(true))
    const toastQueue = useUiStore.getState().toastQueue
    expect(toastQueue[0].variant).toBe('error')
  })
})
