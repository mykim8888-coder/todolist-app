import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { Layout } from '@/components/Layout'
import { Modal } from '@/components/Modal'
import { TodoItem } from '@/features/todo/TodoItem'
import { useAuthStore } from '@/stores/auth.store'
import type { User } from '@/types/user.types'
import type { Todo } from '@/types/todo.types'
import type { Category } from '@/types/category.types'

const mockUser: User = {
  id: 'user-uuid',
  name: '홍길동',
  email: 'hong@example.com',
  auth_provider: 'local',
  created_at: '2026-05-14T00:00:00Z',
  updated_at: '2026-05-14T00:00:00Z',
}

const mockTodo: Todo = {
  id: 'todo-1',
  userId: 'user-uuid',
  categoryId: 'cat-1',
  title: '테스트 할일',
  description: null,
  startDate: null,
  dueDate: null,
  isCompleted: false,
  createdAt: '2026-05-14T00:00:00Z',
  updatedAt: '2026-05-14T00:00:00Z',
}

const mockCategory: Category = {
  id: 'cat-1',
  userId: 'user-uuid',
  name: '일반',
  isDefault: true,
  createdAt: '2026-05-14T00:00:00Z',
}

function renderLayout(path = '/') {
  useAuthStore.setState({ accessToken: 'token', user: mockUser, isAuthenticated: true })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Layout><div>콘텐츠</div></Layout>
    </MemoryRouter>,
  )
}

function renderTodoItem() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ul>
          <TodoItem todo={mockTodo} categories={[mockCategory]} />
        </ul>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('반응형 Layout', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'token', user: mockUser, isAuthenticated: true })
  })

  it('하단 탭 네비게이션이 DOM에 존재한다', () => {
    renderLayout()
    expect(screen.getByRole('navigation', { name: '하단 탭 네비게이션' })).toBeInTheDocument()
  })

  it('하단 탭에 3개 링크가 존재한다', () => {
    renderLayout()
    const bottomNav = screen.getByRole('navigation', { name: '하단 탭 네비게이션' })
    const links = bottomNav.querySelectorAll('a')
    expect(links).toHaveLength(3)
  })

  it('xl 사이드바 네비게이션이 DOM에 존재한다', () => {
    renderLayout()
    expect(screen.getByRole('navigation', { name: '사이드바 네비게이션' })).toBeInTheDocument()
  })

  it('사이드바에 3개 링크가 존재한다', () => {
    renderLayout()
    const sidebar = screen.getByRole('navigation', { name: '사이드바 네비게이션' })
    const links = sidebar.querySelectorAll('a')
    expect(links).toHaveLength(3)
  })

  it('태블릿 메인 네비게이션이 DOM에 존재한다', () => {
    renderLayout()
    expect(screen.getByRole('navigation', { name: '메인 네비게이션' })).toBeInTheDocument()
  })

  it('할일목록 링크가 모든 네비게이션에 존재한다', () => {
    renderLayout()
    const links = screen.getAllByRole('link', { name: '할일목록' })
    expect(links.length).toBeGreaterThanOrEqual(2)
  })

  it('메인 콘텐츠 영역이 xl:ml-60 클래스를 가진다', () => {
    const { container } = renderLayout()
    const main = container.querySelector('main')
    expect(main?.className).toContain('xl:ml-60')
  })

  it('사이드바가 hidden xl:flex 클래스를 가진다', () => {
    const { container } = renderLayout()
    const aside = container.querySelector('aside')
    expect(aside?.className).toContain('hidden')
    expect(aside?.className).toContain('xl:flex')
  })
})

describe('반응형 Modal', () => {
  it('모달 패널이 w-[90vw] 클래스를 가진다', () => {
    const { baseElement } = render(
      <MemoryRouter>
        <Modal isOpen={true} onClose={() => {}} title="테스트 모달">
          <div>내용</div>
        </Modal>
      </MemoryRouter>,
    )
    const panel = baseElement.querySelector('[role="dialog"]')
    expect(panel?.className).toContain('w-[90vw]')
  })

  it('닫기 버튼이 최소 터치 타겟 클래스를 가진다', () => {
    const { baseElement } = render(
      <MemoryRouter>
        <Modal isOpen={true} onClose={() => {}} title="테스트 모달">
          <div>내용</div>
        </Modal>
      </MemoryRouter>,
    )
    const closeBtn = baseElement.querySelector('button[aria-label="닫기"]')
    expect(closeBtn?.className).toContain('min-h-[44px]')
    expect(closeBtn?.className).toContain('min-w-[44px]')
  })
})

describe('반응형 TodoItem 터치 타겟', () => {
  it('수정 버튼이 최소 터치 타겟 클래스를 가진다', () => {
    renderTodoItem()
    const editBtn = screen.getByRole('button', { name: /수정/ })
    expect(editBtn.className).toContain('min-h-[44px]')
    expect(editBtn.className).toContain('min-w-[44px]')
  })

  it('삭제 버튼이 최소 터치 타겟 클래스를 가진다', () => {
    renderTodoItem()
    const deleteBtn = screen.getByRole('button', { name: /삭제/ })
    expect(deleteBtn.className).toContain('min-h-[44px]')
    expect(deleteBtn.className).toContain('min-w-[44px]')
  })

  it('완료 체크박스 버튼이 존재한다', () => {
    renderTodoItem()
    expect(screen.getByRole('checkbox', { name: '할일 완료 토글' })).toBeInTheDocument()
  })
})
