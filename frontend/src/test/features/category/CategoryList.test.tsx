import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { BASE_URL } from '../../mocks/handlers'
import { CategoryList } from '@/features/category/CategoryList'
import { useUiStore } from '@/stores/ui.store'
import type { Category } from '@/types/category.types'

const defaultCategory: Category = {
  id: 'default-cat',
  userId: null,
  name: '일반',
  isDefault: true,
  createdAt: '2026-01-01T00:00:00.000Z',
}

const userCategory: Category = {
  id: 'user-cat',
  userId: 'user-uuid',
  name: '업무',
  isDefault: false,
  createdAt: '2026-01-01T00:00:00.000Z',
}

function renderCategoryList(categories: Category[]) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CategoryList categories={categories} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CategoryList', () => {
  beforeEach(() => {
    useUiStore.setState({ toastQueue: [] })
  })

  it('카테고리 목록이 렌더링된다', () => {
    renderCategoryList([defaultCategory, userCategory])
    expect(screen.getByText('일반')).toBeInTheDocument()
    expect(screen.getByText('업무')).toBeInTheDocument()
  })

  it('isDefault=true 카테고리의 삭제 버튼은 disabled 상태이다', () => {
    renderCategoryList([defaultCategory])
    const deleteBtn = screen.getByRole('button', { name: /일반 삭제/ })
    expect(deleteBtn).toBeDisabled()
  })

  it('isDefault=false 카테고리의 삭제 버튼은 활성화 상태이다', () => {
    renderCategoryList([userCategory])
    const deleteBtn = screen.getByRole('button', { name: /업무 삭제/ })
    expect(deleteBtn).not.toBeDisabled()
  })

  it('isDefault=true 삭제 버튼에 tooltip이 설정된다', () => {
    renderCategoryList([defaultCategory])
    const deleteBtn = screen.getByRole('button', { name: /일반 삭제/ })
    expect(deleteBtn).toHaveAttribute('title', '기본 카테고리는 삭제할 수 없습니다')
  })

  it('삭제 버튼 클릭 시 확인 Modal이 표시된다', async () => {
    const user = userEvent.setup()
    renderCategoryList([userCategory])
    await user.click(screen.getByRole('button', { name: /업무 삭제/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('카테고리 삭제')).toBeInTheDocument()
  })

  it('Modal 취소 버튼 클릭 시 Modal이 닫히고 삭제가 실행되지 않는다', async () => {
    const user = userEvent.setup()
    renderCategoryList([userCategory])
    await user.click(screen.getByRole('button', { name: /업무 삭제/ }))
    await user.click(screen.getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Modal 취소 시 DELETE API가 호출되지 않는다', async () => {
    let deleteCalled = false
    server.use(
      http.delete(`${BASE_URL}/api/categories/:id`, () => {
        deleteCalled = true
        return HttpResponse.json({ success: true, data: null })
      }),
    )
    const user = userEvent.setup()
    renderCategoryList([userCategory])
    await user.click(screen.getByRole('button', { name: /업무 삭제/ }))
    await user.click(screen.getByRole('button', { name: '취소' }))
    expect(deleteCalled).toBe(false)
  })

  it('Modal 삭제 확인 시 DELETE API가 호출된다', async () => {
    let deletedId = ''
    server.use(
      http.delete(`${BASE_URL}/api/categories/:id`, ({ params }) => {
        deletedId = params.id as string
        return HttpResponse.json({ success: true, data: null })
      }),
    )
    const user = userEvent.setup()
    renderCategoryList([userCategory])
    await user.click(screen.getByRole('button', { name: /업무 삭제/ }))
    await user.click(screen.getByRole('button', { name: '삭제' }))
    await waitFor(() => expect(deletedId).toBe('user-cat'))
  })

  it('빈 목록일 때 아이템이 렌더링되지 않는다', () => {
    renderCategoryList([])
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })
})
