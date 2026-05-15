import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { BASE_URL, mockCategoryRaw } from '../../mocks/handlers'
import { CategoryForm } from '@/features/category/CategoryForm'
import { useUiStore } from '@/stores/ui.store'

function renderCategoryForm() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CategoryForm />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CategoryForm', () => {
  beforeEach(() => {
    useUiStore.setState({ toastQueue: [] })
  })

  it('카테고리 이름 입력 필드와 추가 버튼이 렌더링된다', () => {
    renderCategoryForm()
    expect(screen.getByPlaceholderText('새 카테고리 이름')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /추가/ })).toBeInTheDocument()
  })

  it('이름 미입력 후 제출 시 에러 메시지가 표시된다', async () => {
    const user = userEvent.setup()
    renderCategoryForm()
    await user.click(screen.getByRole('button', { name: /추가/ }))
    await waitFor(() => {
      expect(screen.getByText('카테고리 이름을 입력해주세요.')).toBeInTheDocument()
    })
  })

  it('기본 카테고리와 동일한 이름 입력 시 에러 메시지가 표시된다', async () => {
    const user = userEvent.setup()
    renderCategoryForm()

    await waitFor(() => expect(screen.getByPlaceholderText('새 카테고리 이름')).toBeInTheDocument())

    const input = screen.getByPlaceholderText('새 카테고리 이름')
    await user.type(input, '일반')
    await user.click(screen.getByRole('button', { name: /추가/ }))

    await waitFor(() => {
      expect(screen.getByText('기본 카테고리와 동일한 이름은 사용할 수 없습니다.')).toBeInTheDocument()
    })
  })

  it('유효한 이름 제출 시 POST API가 호출된다', async () => {
    let requestBody: unknown
    server.use(
      http.post(`${BASE_URL}/api/categories`, async ({ request }) => {
        requestBody = await request.json()
        return HttpResponse.json({ success: true, data: mockCategoryRaw }, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderCategoryForm()
    await user.type(screen.getByPlaceholderText('새 카테고리 이름'), '새 카테고리')
    await user.click(screen.getByRole('button', { name: /추가/ }))
    await waitFor(() => expect(requestBody).toEqual({ name: '새 카테고리' }))
  })

  it('제출 성공 후 입력 필드가 초기화된다', async () => {
    const user = userEvent.setup()
    renderCategoryForm()
    const input = screen.getByPlaceholderText('새 카테고리 이름')
    await user.type(input, '새 카테고리')
    await user.click(screen.getByRole('button', { name: /추가/ }))
    await waitFor(() => expect(input).toHaveValue(''))
  })

  it('제출 중 버튼이 로딩 상태로 표시된다', async () => {
    let resolveFn!: () => void
    server.use(
      http.post(`${BASE_URL}/api/categories`, () =>
        new Promise((resolve) => {
          resolveFn = () =>
            resolve(HttpResponse.json({ success: true, data: mockCategoryRaw }, { status: 201 }))
        }),
      ),
    )
    const user = userEvent.setup()
    renderCategoryForm()
    await user.type(screen.getByPlaceholderText('새 카테고리 이름'), '새 카테고리')
    await user.click(screen.getByRole('button', { name: /추가/ }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /추가/ })).toBeDisabled()
    })
    resolveFn()
  })

  it('409 에러 응답 시 error Toast가 표시된다', async () => {
    server.use(
      http.post(`${BASE_URL}/api/categories`, () =>
        HttpResponse.json(
          { success: false, error: { code: 'CONFLICT', message: '중복' } },
          { status: 409 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderCategoryForm()
    await user.type(screen.getByPlaceholderText('새 카테고리 이름'), '유효한이름')
    await user.click(screen.getByRole('button', { name: /추가/ }))
    await waitFor(() => {
      const toastQueue = useUiStore.getState().toastQueue
      expect(toastQueue[0].variant).toBe('error')
    })
  })
})
