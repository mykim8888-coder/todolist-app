import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import React from 'react'
import { server } from '../../mocks/server'
import { BASE_URL, mockUser } from '../../mocks/handlers'
import { DeleteAccountSection } from '@/features/profile/DeleteAccountSection'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

function renderDeleteAccountSection() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DeleteAccountSection />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DeleteAccountSection', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: 'mock-token',
      user: mockUser,
      isAuthenticated: true,
    })
    useUiStore.setState({ toastQueue: [] })
  })

  it('회원 탈퇴 버튼이 렌더링된다', () => {
    renderDeleteAccountSection()
    expect(screen.getByRole('button', { name: '회원 탈퇴' })).toBeInTheDocument()
  })

  it('회원 탈퇴 버튼 클릭 시 1단계 Modal이 열린다', async () => {
    const user = userEvent.setup()
    renderDeleteAccountSection()

    await user.click(screen.getByRole('button', { name: '회원 탈퇴' }))

    expect(screen.getByText('회원 탈퇴 확인 (1/2)')).toBeInTheDocument()
    expect(screen.getByLabelText('현재 비밀번호')).toBeInTheDocument()
  })

  it('1단계 Modal에서 취소 클릭 시 Modal이 닫힌다', async () => {
    const user = userEvent.setup()
    renderDeleteAccountSection()

    await user.click(screen.getByRole('button', { name: '회원 탈퇴' }))
    await user.click(screen.getByRole('button', { name: '취소' }))

    await waitFor(() => {
      expect(screen.queryByText('회원 탈퇴 확인 (1/2)')).not.toBeInTheDocument()
    })
  })

  it('비밀번호 미입력 시 다음 단계로 진행되지 않는다', async () => {
    const user = userEvent.setup()
    renderDeleteAccountSection()

    await user.click(screen.getByRole('button', { name: '회원 탈퇴' }))
    await user.click(screen.getByRole('button', { name: /다음 단계/ }))

    await waitFor(() => {
      expect(screen.getByText('비밀번호를 입력해주세요.')).toBeInTheDocument()
    })
    expect(screen.queryByText('최종 확인 (2/2)')).not.toBeInTheDocument()
  })

  it('비밀번호 입력 후 다음 단계 클릭 시 2단계 Modal이 열린다', async () => {
    const user = userEvent.setup()
    renderDeleteAccountSection()

    await user.click(screen.getByRole('button', { name: '회원 탈퇴' }))
    await user.type(screen.getByLabelText('현재 비밀번호'), 'Password123')
    await user.click(screen.getByRole('button', { name: /다음 단계/ }))

    await waitFor(() => {
      expect(screen.getByText('최종 확인 (2/2)')).toBeInTheDocument()
    })
    expect(screen.getByText('정말로 탈퇴하시겠습니까?')).toBeInTheDocument()
  })

  it('2단계 Modal에서 취소 클릭 시 Modal이 닫힌다', async () => {
    const user = userEvent.setup()
    renderDeleteAccountSection()

    await user.click(screen.getByRole('button', { name: '회원 탈퇴' }))
    await user.type(screen.getByLabelText('현재 비밀번호'), 'Password123')
    await user.click(screen.getByRole('button', { name: /다음 단계/ }))

    await waitFor(() => {
      expect(screen.getByText('최종 확인 (2/2)')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /취소/ }))

    await waitFor(() => {
      expect(screen.queryByText('최종 확인 (2/2)')).not.toBeInTheDocument()
    })
  })

  it('탈퇴 성공 시 auth.store가 초기화된다', async () => {
    const user = userEvent.setup()
    renderDeleteAccountSection()

    await user.click(screen.getByRole('button', { name: '회원 탈퇴' }))
    await user.type(screen.getByLabelText('현재 비밀번호'), 'Password123')
    await user.click(screen.getByRole('button', { name: /다음 단계/ }))

    await waitFor(() => {
      expect(screen.getByText('최종 확인 (2/2)')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: '탈퇴하기' }))

    await waitFor(() => {
      expect(useAuthStore.getState().accessToken).toBeNull()
      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
  })

  it('탈퇴 실패(401) 시 에러 Toast가 표시된다', async () => {
    server.use(
      http.delete(`${BASE_URL}/api/users/me`, () =>
        HttpResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: '비밀번호가 올바르지 않습니다.' } },
          { status: 401 },
        ),
      ),
    )

    const user = userEvent.setup()
    renderDeleteAccountSection()

    await user.click(screen.getByRole('button', { name: '회원 탈퇴' }))
    await user.type(screen.getByLabelText('현재 비밀번호'), 'WrongPass1')
    await user.click(screen.getByRole('button', { name: /다음 단계/ }))

    await waitFor(() => {
      expect(screen.getByText('최종 확인 (2/2)')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: '탈퇴하기' }))

    await waitFor(() => {
      const toasts = useUiStore.getState().toastQueue
      expect(toasts.some((t) => t.variant === 'error')).toBe(true)
    })
  })
})
