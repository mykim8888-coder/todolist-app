import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { BASE_URL, mockUser } from '../../mocks/handlers'
import { ProfileForm } from '@/features/profile/ProfileForm'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

function renderProfileForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProfileForm />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProfileForm', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: 'mock-token',
      user: mockUser,
      isAuthenticated: true,
    })
    useUiStore.setState({ toastQueue: [] })
  })

  it('이름 입력 필드와 저장 버튼이 렌더링된다', async () => {
    renderProfileForm()
    await waitFor(() => {
      expect(screen.getByLabelText('이름')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: '이름 저장' })).toBeInTheDocument()
  })

  it('서버에서 가져온 사용자 이름이 초기값으로 설정된다', async () => {
    renderProfileForm()
    await waitFor(() => {
      expect((screen.getByLabelText('이름') as HTMLInputElement).value).toBe(mockUser.name)
    })
  })

  it('이름 빈 값 제출 시 에러 메시지가 표시된다', async () => {
    const user = userEvent.setup()
    renderProfileForm()

    await waitFor(() => {
      expect((screen.getByLabelText('이름') as HTMLInputElement).value).toBe(mockUser.name)
    })

    const nameInput = screen.getByLabelText('이름')
    await user.clear(nameInput)
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText('이름을 입력해주세요.')).toBeInTheDocument()
    })
  })

  it('이름 수정 성공 시 auth.store의 user.name이 갱신된다', async () => {
    const updatedUser = { ...mockUser, name: '새이름' }
    server.use(
      http.patch(`${BASE_URL}/api/users/me`, () =>
        HttpResponse.json({ success: true, data: updatedUser }),
      ),
    )

    const user = userEvent.setup()
    renderProfileForm()

    await waitFor(() => {
      expect(screen.getByLabelText('이름')).toBeInTheDocument()
    })

    const nameInput = screen.getByLabelText('이름')
    await user.clear(nameInput)
    await user.type(nameInput, '새이름')
    await user.click(screen.getByRole('button', { name: '이름 저장' }))

    await waitFor(() => {
      expect(useAuthStore.getState().user?.name).toBe('새이름')
    })
  })

  it('이름 수정 성공 시 성공 Toast가 표시된다', async () => {
    const user = userEvent.setup()
    renderProfileForm()

    await waitFor(() => {
      expect(screen.getByLabelText('이름')).toBeInTheDocument()
    })

    const nameInput = screen.getByLabelText('이름')
    await user.clear(nameInput)
    await user.type(nameInput, '변경이름')
    await user.click(screen.getByRole('button', { name: '이름 저장' }))

    await waitFor(() => {
      const toasts = useUiStore.getState().toastQueue
      expect(toasts.some((t) => t.variant === 'success')).toBe(true)
    })
  })

  it('이름 수정 실패 시 에러 Toast가 표시된다', async () => {
    server.use(
      http.patch(`${BASE_URL}/api/users/me`, () =>
        HttpResponse.json(
          { success: false, error: { code: 'SERVER_ERROR', message: '서버 오류' } },
          { status: 500 },
        ),
      ),
    )

    const user = userEvent.setup()
    renderProfileForm()

    await waitFor(() => {
      expect(screen.getByLabelText('이름')).toBeInTheDocument()
    })

    const nameInput = screen.getByLabelText('이름')
    await user.clear(nameInput)
    await user.type(nameInput, '변경이름')
    await user.click(screen.getByRole('button', { name: '이름 저장' }))

    await waitFor(() => {
      const toasts = useUiStore.getState().toastQueue
      expect(toasts.some((t) => t.variant === 'error')).toBe(true)
    })
  })
})
