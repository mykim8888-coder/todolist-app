import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { PrivateRoute } from '@/App'
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

describe('PrivateRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })

  it('비인증 상태에서 /login으로 리다이렉트된다', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <PrivateRoute>
                <div>Protected</div>
              </PrivateRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected')).not.toBeInTheDocument()
  })

  it('인증 상태에서 children을 렌더링한다', () => {
    useAuthStore.setState({ accessToken: 'token', user: mockUser, isAuthenticated: true })
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <PrivateRoute>
                <div>Protected Content</div>
              </PrivateRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('비인증 상태에서 리다이렉트 시 원래 경로가 location state에 보존된다', () => {
    let capturedState: unknown = null

    function LoginPage() {
      const location = require('react-router-dom').useLocation()
      capturedState = location.state
      return <div>Login Page</div>
    }

    render(
      <MemoryRouter initialEntries={['/categories']}>
        <Routes>
          <Route
            path="/categories"
            element={
              <PrivateRoute>
                <div>Categories</div>
              </PrivateRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect((capturedState as { from?: { pathname: string } })?.from?.pathname).toBe('/categories')
  })

  it('/categories 경로에서 비인증 시 /login으로 리다이렉트된다', () => {
    render(
      <MemoryRouter initialEntries={['/categories']}>
        <Routes>
          <Route
            path="/categories"
            element={
              <PrivateRoute>
                <div>Categories</div>
              </PrivateRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })
})
