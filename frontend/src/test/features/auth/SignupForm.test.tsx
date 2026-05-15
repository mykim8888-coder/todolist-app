import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { BASE_URL } from '../../mocks/handlers'
import { SignupForm } from '@/features/auth/SignupForm'
import { useUiStore } from '@/stores/ui.store'

function renderSignupForm() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SignupForm />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SignupForm', () => {
  beforeEach(() => {
    useUiStore.setState({ toastQueue: [] })
  })

  it('이름, 이메일, 비밀번호, 비밀번호 확인 필드가 렌더링된다', () => {
    renderSignupForm()
    expect(screen.getByLabelText('이름')).toBeInTheDocument()
    expect(screen.getByLabelText('이메일')).toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호 확인')).toBeInTheDocument()
  })

  it('잘못된 이메일 형식 입력 후 blur 시 에러 메시지가 표시된다', async () => {
    const user = userEvent.setup()
    renderSignupForm()

    const emailInput = screen.getByLabelText('이메일')
    await user.click(emailInput)
    await user.type(emailInput, 'not-an-email')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText('올바른 이메일 형식을 입력해주세요.')).toBeInTheDocument()
    })
  })

  it('비밀번호가 8자 미만이면 에러 메시지가 표시된다', async () => {
    const user = userEvent.setup()
    renderSignupForm()

    const passwordInput = screen.getByLabelText('비밀번호')
    await user.click(passwordInput)
    await user.type(passwordInput, 'abc1')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText('비밀번호는 최소 8자 이상이어야 합니다.')).toBeInTheDocument()
    })
  })

  it('비밀번호에 영문자가 없으면 에러 메시지가 표시된다', async () => {
    const user = userEvent.setup()
    renderSignupForm()

    const passwordInput = screen.getByLabelText('비밀번호')
    await user.click(passwordInput)
    await user.type(passwordInput, '12345678')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText('영문자를 포함해야 합니다.')).toBeInTheDocument()
    })
  })

  it('비밀번호에 숫자가 없으면 에러 메시지가 표시된다', async () => {
    const user = userEvent.setup()
    renderSignupForm()

    const passwordInput = screen.getByLabelText('비밀번호')
    await user.click(passwordInput)
    await user.type(passwordInput, 'abcdefgh')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText('숫자를 포함해야 합니다.')).toBeInTheDocument()
    })
  })

  it('비밀번호 확인이 일치하지 않으면 에러 메시지가 표시된다', async () => {
    const user = userEvent.setup()
    renderSignupForm()

    await user.type(screen.getByLabelText('비밀번호'), 'password123')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'different123')
    await user.click(screen.getByRole('button', { name: '회원가입' }))

    await waitFor(() => {
      expect(screen.getByText('비밀번호가 일치하지 않습니다.')).toBeInTheDocument()
    })
  })

  it('이메일 중복 409 응답 시 "이미 사용 중인 이메일입니다" Toast가 표시된다', async () => {
    server.use(
      http.post(`${BASE_URL}/api/auth/signup`, () =>
        HttpResponse.json(
          { success: false, error: { code: 'CONFLICT', message: '이미 사용 중인 이메일입니다.' } },
          { status: 409 },
        ),
      ),
    )

    const user = userEvent.setup()
    renderSignupForm()

    await user.type(screen.getByLabelText('이름'), '홍길동')
    await user.type(screen.getByLabelText('이메일'), 'test@test.com')
    await user.type(screen.getByLabelText('비밀번호'), 'password123')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'password123')
    await user.click(screen.getByRole('button', { name: '회원가입' }))

    await waitFor(() => {
      const toastQueue = useUiStore.getState().toastQueue
      expect(toastQueue.length).toBeGreaterThan(0)
      expect(toastQueue[0].message).toBe('이미 사용 중인 이메일입니다.')
      expect(toastQueue[0].variant).toBe('error')
    })
  })

  it('회원가입 성공 시 success Toast가 표시된다', async () => {
    const user = userEvent.setup()
    renderSignupForm()

    await user.type(screen.getByLabelText('이름'), '홍길동')
    await user.type(screen.getByLabelText('이메일'), 'new@test.com')
    await user.type(screen.getByLabelText('비밀번호'), 'password123')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'password123')
    await user.click(screen.getByRole('button', { name: '회원가입' }))

    await waitFor(() => {
      const toastQueue = useUiStore.getState().toastQueue
      expect(toastQueue.length).toBeGreaterThan(0)
      expect(toastQueue[0].variant).toBe('success')
    })
  })

  it('회원가입 중 버튼이 로딩 상태로 표시된다', async () => {
    let resolveFn!: () => void
    server.use(
      http.post(`${BASE_URL}/api/auth/signup`, () =>
        new Promise((resolve) => {
          resolveFn = () =>
            resolve(HttpResponse.json({ success: true, data: {} }, { status: 201 }))
        }),
      ),
    )

    const user = userEvent.setup()
    renderSignupForm()

    await user.type(screen.getByLabelText('이름'), '홍길동')
    await user.type(screen.getByLabelText('이메일'), 'new@test.com')
    await user.type(screen.getByLabelText('비밀번호'), 'password123')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'password123')
    await user.click(screen.getByRole('button', { name: /회원가입/ }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /회원가입/ })).toBeDisabled()
    })
    resolveFn()
  })

  it('로그인 링크가 렌더링된다', () => {
    renderSignupForm()
    expect(screen.getByRole('link', { name: '로그인' })).toBeInTheDocument()
  })
})
