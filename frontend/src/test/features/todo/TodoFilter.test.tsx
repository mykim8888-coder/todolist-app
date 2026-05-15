import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useSearchParams } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { TodoFilter } from '@/features/todo/TodoFilter'
import type { Category } from '@/types/category.types'

const mockCategories: Category[] = [
  { id: 'cat-1', userId: null, name: '일반', isDefault: true, createdAt: '' },
  { id: 'cat-2', userId: 'u1', name: '업무', isDefault: false, createdAt: '' },
]

function SearchParamsDisplay() {
  const [params] = useSearchParams()
  return <div data-testid="params">{params.toString()}</div>
}

function renderFilter(initialSearch = '') {
  return render(
    <MemoryRouter initialEntries={[`/${initialSearch}`]}>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <TodoFilter categories={mockCategories} />
              <SearchParamsDisplay />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TodoFilter', () => {
  it('카테고리 select가 렌더링된다', () => {
    renderFilter()
    expect(screen.getByRole('combobox', { name: '카테고리 필터' })).toBeInTheDocument()
  })

  it('카테고리 목록이 옵션으로 표시된다', () => {
    renderFilter()
    expect(screen.getByRole('option', { name: '일반' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '업무' })).toBeInTheDocument()
  })

  it('카테고리 선택 시 URL 쿼리스트링이 업데이트된다', async () => {
    renderFilter()
    const select = screen.getByRole('combobox', { name: '카테고리 필터' })
    await userEvent.selectOptions(select, 'cat-2')
    expect(screen.getByTestId('params').textContent).toContain('categoryId=cat-2')
  })

  it('완료된 항목 체크박스 선택 시 URL에 isCompleted=true가 추가된다', async () => {
    renderFilter()
    await userEvent.click(screen.getByLabelText('완료된 항목'))
    expect(screen.getByTestId('params').textContent).toContain('isCompleted=true')
  })

  it('기간 만료 체크박스 선택 시 URL에 overdue=true가 추가된다', async () => {
    renderFilter()
    await userEvent.click(screen.getByLabelText('기간 만료'))
    expect(screen.getByTestId('params').textContent).toContain('overdue=true')
  })

  it('완료된 항목 체크 해제 시 isCompleted가 URL에서 제거된다', async () => {
    renderFilter('?isCompleted=true')
    const checkbox = screen.getByLabelText('완료된 항목')
    expect(checkbox).toBeChecked()
    await userEvent.click(checkbox)
    expect(screen.getByTestId('params').textContent).not.toContain('isCompleted')
  })

  it('3가지 필터를 동시에 적용하면 URL에 모두 반영된다', async () => {
    renderFilter()
    await userEvent.selectOptions(screen.getByRole('combobox'), 'cat-1')
    await userEvent.click(screen.getByLabelText('완료된 항목'))
    await userEvent.click(screen.getByLabelText('기간 만료'))
    const params = screen.getByTestId('params').textContent ?? ''
    expect(params).toContain('categoryId=cat-1')
    expect(params).toContain('isCompleted=true')
    expect(params).toContain('overdue=true')
  })
})
