import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { BASE_URL, mockUser } from '../../mocks/handlers'
import { LoginForm } from '@/features/auth/LoginForm'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

function renderLoginForm() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LoginForm', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
    useUiStore.setState({ toastQueue: [] })
  })

  it('이메일과 비밀번호 입력 필드가 렌더링된다', () => {
    renderLoginForm()
    expect(screen.getByLabelText('이메일')).toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument()
  })

  it('잘못된 이메일 형식 입력 후 blur 시 에러 메시지가 표시된다', async () => {
    const user = userEvent.setup()
    renderLoginForm()

    const emailInput = screen.getByLabelText('이메일')
    await user.click(emailInput)
    await user.type(emailInput, 'invalid-email')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText('올바른 이메일 형식을 입력해주세요.')).toBeInTheDocument()
    })
  })

  it('비밀번호 미입력 후 폼 제출 시 에러 메시지가 표시된다', async () => {
    const user = userEvent.setup()
    renderLoginForm()

    const submitButton = screen.getByRole('button', { name: '로그인' })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('비밀번호를 입력해주세요.')).toBeInTheDocument()
    })
  })

  it('로그인 성공 시 auth.store에 accessToken이 저장된다', async () => {
    const user = userEvent.setup()
    renderLoginForm()

    await user.type(screen.getByLabelText('이메일'), 'test@test.com')
    await user.type(screen.getByLabelText('비밀번호'), 'password123')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => {
      expect(useAuthStore.getState().accessToken).toBe('mock-access-token')
    })
    expect(useAuthStore.getState().user).toEqual(mockUser)
  })

  it('로그인 중 버튼이 로딩 상태로 표시된다', async () => {
    let resolveFn!: () => void
    server.use(
      http.post(`${BASE_URL}/api/auth/login`, () =>
        new Promise((resolve) => {
          resolveFn = () =>
            resolve(HttpResponse.json({ success: true, data: { accessToken: 'tok', user: mockUser } }))
        }),
      ),
    )

    const user = userEvent.setup()
    renderLoginForm()

    await user.type(screen.getByLabelText('이메일'), 'test@test.com')
    await user.type(screen.getByLabelText('비밀번호'), 'password123')
    await user.click(screen.getByRole('button', { name: /로그인/ }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /로그인/ })).toBeDisabled()
    })
    resolveFn()
  })

  it('로그인 실패 시 error Toast가 표시된다', async () => {
    server.use(
      http.post(`${BASE_URL}/api/auth/login`, () =>
        HttpResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: '이메일 또는 비밀번호가 올바르지 않습니다.' } },
          { status: 401 },
        ),
      ),
    )

    const user = userEvent.setup()
    renderLoginForm()

    await user.type(screen.getByLabelText('이메일'), 'test@test.com')
    await user.type(screen.getByLabelText('비밀번호'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => {
      const toastQueue = useUiStore.getState().toastQueue
      expect(toastQueue.length).toBeGreaterThan(0)
      expect(toastQueue[0].variant).toBe('error')
    })
  })

  it('회원가입 링크가 렌더링된다', () => {
    renderLoginForm()
    expect(screen.getByRole('link', { name: '회원가입' })).toBeInTheDocument()
  })
})
