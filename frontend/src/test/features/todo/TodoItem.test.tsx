import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import React from 'react'
import { server } from '../../mocks/server'
import { BASE_URL, mockTodoRaw } from '../../mocks/handlers'
import { TodoItem } from '@/features/todo/TodoItem'
import { useUiStore } from '@/stores/ui.store'
import { todoKeys } from '@/api/queryKeys'
import type { Todo } from '@/types/todo.types'
import type { Category } from '@/types/category.types'

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

const mockCategories: Category[] = [
  { id: 'cat-uuid', userId: null, name: '일반', isDefault: true, createdAt: '' },
]

function createWrapper(initialTodo = mockTodo) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData<Todo[]>(todoKeys.list({}), [initialTodo])
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ul>{children}</ul>
      </MemoryRouter>
    </QueryClientProvider>
  )
  return { queryClient, Wrapper }
}

describe('TodoItem', () => {
  beforeEach(() => {
    useUiStore.setState({ toastQueue: [] })
    vi.setSystemTime(new Date('2026-05-14T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('할일 제목이 렌더링된다', () => {
    const { Wrapper } = createWrapper()
    render(<TodoItem todo={mockTodo} categories={mockCategories} filter={{}} />, { wrapper: Wrapper })
    expect(screen.getByText('테스트 할일')).toBeInTheDocument()
  })

  it('카테고리 배지가 표시된다', () => {
    const { Wrapper } = createWrapper()
    render(<TodoItem todo={mockTodo} categories={mockCategories} filter={{}} />, { wrapper: Wrapper })
    expect(screen.getByText('일반')).toBeInTheDocument()
  })

  it('완료 체크박스 클릭 시 Optimistic Update로 즉시 UI가 변경된다', async () => {
    let resolveResponse!: () => void
    const responsePromise = new Promise<void>((res) => { resolveResponse = res })
    server.use(
      http.patch(`${BASE_URL}/api/todos/:id`, async () => {
        await responsePromise
        return HttpResponse.json({ success: true, data: { ...mockTodoRaw, is_completed: true } })
      }),
    )

    const { queryClient, Wrapper } = createWrapper()
    render(<TodoItem todo={mockTodo} categories={mockCategories} filter={{}} />, { wrapper: Wrapper })

    const checkbox = screen.getByRole('checkbox', { name: '할일 완료 토글' })
    await userEvent.click(checkbox)

    await waitFor(() => {
      const cached = queryClient.getQueryData<Todo[]>(todoKeys.list({}))
      expect(cached![0].isCompleted).toBe(true)
    })

    resolveResponse()
  })

  it('완료된 할일은 제목에 줄긋기가 적용된다', () => {
    const completedTodo = { ...mockTodo, isCompleted: true }
    const { Wrapper } = createWrapper(completedTodo)
    render(<TodoItem todo={completedTodo} categories={mockCategories} filter={{}} />, { wrapper: Wrapper })
    const titleEl = screen.getByText('테스트 할일')
    expect(titleEl).toHaveClass('line-through')
  })

  it('기간 만료된 할일에 "기간 만료" 배지가 표시된다', () => {
    vi.setSystemTime(new Date('2026-05-20T12:00:00'))
    const overdueTodo = { ...mockTodo, dueDate: '2026-05-14' }
    const { Wrapper } = createWrapper(overdueTodo)
    render(<TodoItem todo={overdueTodo} categories={mockCategories} filter={{}} />, { wrapper: Wrapper })
    expect(screen.getByText('기간 만료')).toBeInTheDocument()
  })

  it('삭제 버튼 클릭 시 확인 Modal이 표시된다', async () => {
    const { Wrapper } = createWrapper()
    render(<TodoItem todo={mockTodo} categories={mockCategories} filter={{}} />, { wrapper: Wrapper })
    const deleteBtn = screen.getByRole('button', { name: /삭제/ })
    await userEvent.click(deleteBtn)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('할일 삭제')).toBeInTheDocument()
  })

  it('삭제 Modal에서 취소 클릭 시 Modal이 닫히고 삭제가 실행되지 않는다', async () => {
    const deleteSpy = vi.fn(() => HttpResponse.json({ success: true, data: null }))
    server.use(http.delete(`${BASE_URL}/api/todos/:id`, deleteSpy))

    const { Wrapper } = createWrapper()
    render(<TodoItem todo={mockTodo} categories={mockCategories} filter={{}} />, { wrapper: Wrapper })

    await userEvent.click(screen.getByRole('button', { name: /삭제/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(deleteSpy).not.toHaveBeenCalled()
  })

  it('API 실패 시 롤백되어 이전 완료 상태로 복원된다', async () => {
    server.use(
      http.patch(`${BASE_URL}/api/todos/:id`, () =>
        HttpResponse.json({ success: false }, { status: 500 }),
      ),
    )
    const { queryClient, Wrapper } = createWrapper()
    render(<TodoItem todo={mockTodo} categories={mockCategories} filter={{}} />, { wrapper: Wrapper })

    const checkbox = screen.getByRole('checkbox', { name: '할일 완료 토글' })
    await userEvent.click(checkbox)

    await waitFor(() => {
      const cached = queryClient.getQueryData<Todo[]>(todoKeys.list({}))
      expect(cached![0].isCompleted).toBe(false)
    })
  })
})
