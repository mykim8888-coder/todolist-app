import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import React from 'react'
import { TodoList } from '@/features/todo/TodoList'
import type { Todo } from '@/types/todo.types'
import type { Category } from '@/types/category.types'

const mockTodo: Todo = {
  id: 'todo-uuid',
  userId: 'user-uuid',
  categoryId: 'cat-uuid',
  title: '테스트 할일',
  description: null,
  startDate: null,
  dueDate: null,
  isCompleted: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const mockCategories: Category[] = [
  { id: 'cat-uuid', userId: null, name: '일반', isDefault: true, createdAt: '' },
]

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('TodoList', () => {
  it('로딩 중일 때 Spinner를 표시한다', () => {
    render(<TodoList todos={undefined} categories={[]} isLoading={true} />, { wrapper: Wrapper })
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('빈 목록일 때 안내 메시지를 표시한다', () => {
    render(<TodoList todos={[]} categories={[]} isLoading={false} />, { wrapper: Wrapper })
    expect(screen.getByText('할일이 없습니다.')).toBeInTheDocument()
  })

  it('할일 목록이 렌더링된다', () => {
    render(
      <TodoList todos={[mockTodo]} categories={mockCategories} isLoading={false} />,
      { wrapper: Wrapper },
    )
    expect(screen.getByText('테스트 할일')).toBeInTheDocument()
  })

  it('todos가 undefined이고 로딩 아닐 때 빈 안내 메시지를 표시한다', () => {
    render(<TodoList todos={undefined} categories={[]} isLoading={false} />, { wrapper: Wrapper })
    expect(screen.getByText('할일이 없습니다.')).toBeInTheDocument()
  })
})
