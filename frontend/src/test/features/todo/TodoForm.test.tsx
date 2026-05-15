import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { server } from '../../mocks/server'
import { BASE_URL, mockTodoRaw, mockCategoryRaw } from '../../mocks/handlers'
import TodoForm from '@/features/todo/TodoForm'
import { useUiStore } from '@/stores/ui.store'
import type { Todo } from '@/types/todo.types'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockTodo: Todo = {
  id: 'todo-uuid',
  userId: 'user-uuid',
  categoryId: 'cat-uuid',
  title: '테스트 할일',
  description: '테스트 설명',
  startDate: '2026-05-10',
  dueDate: '2026-05-15',
  isCompleted: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    ),
  }
}

describe('TodoForm (할일 등록)', () => {
  beforeEach(() => {
    useUiStore.setState({ toastQueue: [] })
    mockNavigate.mockClear()
    server.use(
      http.get(`${BASE_URL}/api/categories`, () =>
        HttpResponse.json({ success: true, data: [mockCategoryRaw] }),
      ),
    )
  })

  it('카테고리 미선택 시 폼 제출 시 에러가 표시된다 (BR-04)', async () => {
    const { wrapper } = createWrapper()
    render(<TodoForm />, { wrapper })

    const titleInput = screen.getByPlaceholderText('할일 제목을 입력하세요')
    await userEvent.type(titleInput, '새 할일')

    const submitButton = screen.getByRole('button', { name: /저장하기/ })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('카테고리를 선택해 주세요.')).toBeInTheDocument()
    })
  })

  it('dueDate < startDate 시 에러가 표시된다 (BR-05)', async () => {
    const { wrapper } = createWrapper()
    render(<TodoForm />, { wrapper })

    const titleInput = screen.getByPlaceholderText('할일 제목을 입력하세요')
    await userEvent.type(titleInput, '새 할일')

    const categorySelect = screen.getByRole('combobox', { name: /카테고리/ })
    await userEvent.selectOptions(categorySelect, 'cat-uuid')

    const startDateInput = screen.getByLabelText('시작일')
    await userEvent.clear(startDateInput)
    await userEvent.type(startDateInput, '2026-05-20')

    const dueDateInput = screen.getByLabelText('종료 예정일')
    await userEvent.clear(dueDateInput)
    await userEvent.type(dueDateInput, '2026-05-10')

    const submitButton = screen.getByRole('button', { name: /저장하기/ })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/종료 예정일.*이후여야 합니다/)).toBeInTheDocument()
    })
  })

  it('제출 버튼이 렌더링된다', async () => {
    const { wrapper } = createWrapper()
    render(<TodoForm />, { wrapper })

    expect(screen.getByRole('button', { name: /저장하기/ })).toBeInTheDocument()
  })

  it('할일 등록 성공 시 성공 Toast가 표시되고 "/"로 이동한다', async () => {
    const { wrapper } = createWrapper()
    render(<TodoForm />, { wrapper })

    await waitFor(() => expect(screen.getByRole('combobox', { name: /카테고리/ })).toBeInTheDocument())

    await userEvent.type(screen.getByPlaceholderText('할일 제목을 입력하세요'), '새 할일')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /카테고리/ }), 'cat-uuid')
    await userEvent.click(screen.getByRole('button', { name: /저장하기/ }))

    await waitFor(() => {
      const { toastQueue } = useUiStore.getState()
      expect(toastQueue.some((t) => t.message.includes('등록') && t.variant === 'success')).toBe(true)
    })
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('취소 버튼 클릭 시 "/"로 이동한다', async () => {
    const { wrapper } = createWrapper()
    render(<TodoForm />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})

describe('TodoForm (할일 수정)', () => {
  beforeEach(() => {
    useUiStore.setState({ toastQueue: [] })
    mockNavigate.mockClear()
    server.use(
      http.get(`${BASE_URL}/api/categories`, () =>
        HttpResponse.json({ success: true, data: [mockCategoryRaw] }),
      ),
    )
  })

  it('수정 모드에서 기존 데이터가 폼에 사전 입력된다', async () => {
    const { wrapper } = createWrapper()
    render(<TodoForm todo={mockTodo} />, { wrapper })

    const titleInput = screen.getByDisplayValue('테스트 할일')
    expect(titleInput).toBeInTheDocument()

    const descriptionInput = screen.getByDisplayValue('테스트 설명')
    expect(descriptionInput).toBeInTheDocument()
  })

  it('수정 버튼 텍스트가 "수정 저장하기"로 표시된다', async () => {
    const { wrapper } = createWrapper()
    render(<TodoForm todo={mockTodo} />, { wrapper })

    expect(screen.getByRole('button', { name: /수정 저장하기/ })).toBeInTheDocument()
  })

  it('할일 수정 제출 시 PATCH API가 호출되고 "/"로 이동한다', async () => {
    let patchCalled = false
    server.use(
      http.patch(`${BASE_URL}/api/todos/:id`, () => {
        patchCalled = true
        return HttpResponse.json({ success: true, data: { ...mockTodoRaw, title: '수정된 할일' } })
      }),
    )

    const { wrapper } = createWrapper()
    render(<TodoForm todo={mockTodo} />, { wrapper })

    await waitFor(() => expect(screen.getByText('일반')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /수정 저장하기/ }))

    await waitFor(() => expect(patchCalled).toBe(true))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'))
  })
})