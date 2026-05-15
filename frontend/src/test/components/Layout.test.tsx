import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { useAuthStore } from '@/stores/auth.store'
import type { User } from '@/types/user.types'

const mockUser: User = {
  id: 'user-uuid',
  name: '홍길동',
  email: 'hong@example.com',
  auth_provider: 'local',
  created_at: '2026-05-14T00:00:00Z',
  updated_at: '2026-05-14T00:00:00Z',
}

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('Layout', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'token', user: mockUser, isAuthenticated: true })
  })

  afterEach(() => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })

  it('로고 "TodoApp"을 렌더링한다', () => {
    renderWithRouter(<Layout><div>내용</div></Layout>)
    expect(screen.getAllByText('TodoApp').length).toBeGreaterThan(0)
  })

  it('children을 렌더링한다', () => {
    renderWithRouter(<Layout><div>페이지 내용</div></Layout>)
    expect(screen.getByText('페이지 내용')).toBeInTheDocument()
  })

  it('로그인된 사용자 이름이 표시된다', () => {
    renderWithRouter(<Layout><div /></Layout>)
    expect(screen.getByText(/홍길동/)).toBeInTheDocument()
  })

  it('nav 요소가 렌더링된다', () => {
    renderWithRouter(<Layout><div /></Layout>)
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0)
  })

  it('로그아웃 버튼이 렌더링된다', () => {
    renderWithRouter(<Layout><div /></Layout>)
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument()
  })

  it('할일목록 링크가 렌더링된다', () => {
    renderWithRouter(<Layout><div /></Layout>)
    const links = screen.getAllByRole('link', { name: '할일목록' })
    expect(links.length).toBeGreaterThan(0)
  })

  it('카테고리 링크가 렌더링된다', () => {
    renderWithRouter(<Layout><div /></Layout>)
    const links = screen.getAllByRole('link', { name: '카테고리' })
    expect(links.length).toBeGreaterThan(0)
  })
})
