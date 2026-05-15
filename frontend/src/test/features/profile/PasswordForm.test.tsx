import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { BASE_URL } from '../../mocks/handlers'
import { PasswordForm } from '@/features/profile/PasswordForm'
import { useUiStore } from '@/stores/ui.store'

function renderPasswordForm() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PasswordForm />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PasswordForm', () => {
  beforeEach(() => {
    useUiStore.setState({ toastQueue: [] })
  })

  it('비밀번호 변경 폼 필드들이 렌더링된다', () => {
    renderPasswordForm()
    expect(screen.getByLabelText('현재 비밀번호')).toBeInTheDocument()
    expect(screen.getByLabelText('새 비밀번호')).toBeInTheDocument()
    expect(screen.getByLabelText('새 비밀번호 확인')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '비밀번호 변경' })).toBeInTheDocument()
  })

  it('현재 비밀번호 미입력 후 blur 시 에러 메시지가 표시된다', async () => {
    const user = userEvent.setup()
    renderPasswordForm()

    await user.click(screen.getByLabelText('현재 비밀번호'))
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText('현재 비밀번호를 입력해주세요.')).toBeInTheDocument()
    })
  })

  it('새 비밀번호가 8자 미만일 때 에러 메시지가 표시된다', async () => {
    const user = userEvent.setup()
    renderPasswordForm()

    await user.type(screen.getByLabelText('새 비밀번호'), 'abc123')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText('비밀번호는 최소 8자 이상이어야 합니다.')).toBeInTheDocument()
    })
  })

  it('새 비밀번호에 영문자가 없을 때 에러 메시지가 표시된다', async () => {
    const user = userEvent.setup()
    renderPasswordForm()

    await user.type(screen.getByLabelText('새 비밀번호'), '12345678')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText('영문자를 포함해야 합니다.')).toBeInTheDocument()
    })
  })

  it('새 비밀번호 불일치 시 에러 메시지가 표시된다', async () => {
    const user = userEvent.setup()
    renderPasswordForm()

    await user.type(screen.getByLabelText('새 비밀번호'), 'Password123')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'DifferentPassword123')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText('새 비밀번호가 일치하지 않습니다.')).toBeInTheDocument()
    })
  })

  it('비밀번호 변경 성공 시 성공 Toast가 표시된다', async () => {
    const user = userEvent.setup()
    renderPasswordForm()

    await user.type(screen.getByLabelText('현재 비밀번호'), 'CurrentPass1')
    await user.type(screen.getByLabelText('새 비밀번호'), 'NewPass1234')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'NewPass1234')
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    await waitFor(() => {
      const toasts = useUiStore.getState().toastQueue
      expect(toasts.some((t) => t.variant === 'success')).toBe(true)
    })
  })

  it('현재 비밀번호 401 에러 시 에러 Toast가 표시된다', async () => {
    server.use(
      http.patch(`${BASE_URL}/api/users/me`, () =>
        HttpResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: '비밀번호가 일치하지 않습니다.' } },
          { status: 401 },
        ),
      ),
    )

    const user = userEvent.setup()
    renderPasswordForm()

    await user.type(screen.getByLabelText('현재 비밀번호'), 'WrongPass1')
    await user.type(screen.getByLabelText('새 비밀번호'), 'NewPass1234')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'NewPass1234')
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    await waitFor(() => {
      const toasts = useUiStore.getState().toastQueue
      expect(toasts.some((t) => t.variant === 'error')).toBe(true)
    })
  })

  it('비밀번호 변경 성공 시 폼이 초기화된다', async () => {
    const user = userEvent.setup()
    renderPasswordForm()

    const currentPwInput = screen.getByLabelText('현재 비밀번호') as HTMLInputElement
    await user.type(currentPwInput, 'CurrentPass1')
    await user.type(screen.getByLabelText('새 비밀번호'), 'NewPass1234')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'NewPass1234')
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    await waitFor(() => {
      expect(currentPwInput.value).toBe('')
    })
  })
})
