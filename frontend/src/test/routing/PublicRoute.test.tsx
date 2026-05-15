import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { PublicRoute } from '@/App'
import { useAuthStore } from '@/stores/auth.store'
import type { User } from '@/types/user.types'

const mockUser: User = {
  id: 'u',
  name: 'User',
  email: 'a@b.com',
  auth_provider: 'local',
  created_at: '',
  updated_at: '',
}

describe('PublicRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })

  it('비인증 상태에서 children을 렌더링한다', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <div>Login Form</div>
              </PublicRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Login Form')).toBeInTheDocument()
  })

  it('인증 상태에서 /로 리다이렉트된다', () => {
    useAuthStore.setState({ accessToken: 'token', user: mockUser, isAuthenticated: true })
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <div>Login Form</div>
              </PublicRoute>
            }
          />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Home Page')).toBeInTheDocument()
    expect(screen.queryByText('Login Form')).not.toBeInTheDocument()
  })

  it('signup 경로에서 비인증 시 children을 렌더링한다', () => {
    render(
      <MemoryRouter initialEntries={['/signup']}>
        <Routes>
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <div>Signup Form</div>
              </PublicRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Signup Form')).toBeInTheDocument()
  })

  it('인증 상태에서 /signup 접근 시 /로 리다이렉트된다', () => {
    useAuthStore.setState({ accessToken: 'token', user: mockUser, isAuthenticated: true })
    render(
      <MemoryRouter initialEntries={['/signup']}>
        <Routes>
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <div>Signup Form</div>
              </PublicRoute>
            }
          />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Home Page')).toBeInTheDocument()
  })
})
