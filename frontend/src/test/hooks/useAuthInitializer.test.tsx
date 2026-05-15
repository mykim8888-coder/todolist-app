import { render, screen, waitFor } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { BASE_URL, mockUser } from '../mocks/handlers'
import { useAuthInitializer } from '@/hooks/useAuthInitializer'
import { useAuthStore } from '@/stores/auth.store'
import { _nav } from '@/api/client'
import React from 'react'

function resetStore() {
  useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
)

describe('useAuthInitializer', () => {
  beforeEach(() => {
    resetStore()
    vi.spyOn(_nav, 'redirectToLogin').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('초기에 isInitializing이 true이다', () => {
    useAuthStore.setState({ accessToken: 'valid-token', user: null, isAuthenticated: false })
    const { result } = renderHook(() => useAuthInitializer(), { wrapper })
    expect(result.current.isInitializing).toBe(true)
  })

  it('getMe 성공 시 isInitializing이 false로 전환된다', async () => {
    useAuthStore.setState({ accessToken: 'valid-token', user: null, isAuthenticated: false })
    const { result } = renderHook(() => useAuthInitializer(), { wrapper })
    await waitFor(() => expect(result.current.isInitializing).toBe(false))
  })

  it('getMe 성공 시 auth.store에 user가 저장된다', async () => {
    useAuthStore.setState({ accessToken: 'valid-token', user: null, isAuthenticated: false })
    renderHook(() => useAuthInitializer(), { wrapper })
    await waitFor(() => expect(useAuthStore.getState().user).not.toBeNull())
    expect(useAuthStore.getState().user?.email).toBe(mockUser.email)
  })

  it('getMe 성공 시 isAuthenticated가 true로 설정된다', async () => {
    useAuthStore.setState({ accessToken: 'valid-token', user: null, isAuthenticated: false })
    renderHook(() => useAuthInitializer(), { wrapper })
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true))
  })

  it('getMe 실패 시 isInitializing이 false로 전환된다', async () => {
    server.use(
      http.get(`${BASE_URL}/api/users/me`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${BASE_URL}/api/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
    )
    const { result } = renderHook(() => useAuthInitializer(), { wrapper })
    await waitFor(() => expect(result.current.isInitializing).toBe(false))
  })

  it('getMe 실패 시 /login으로 이동한다', async () => {
    server.use(
      http.get(`${BASE_URL}/api/users/me`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${BASE_URL}/api/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
    )

    function LocationDisplay() {
      const location = useLocation()
      return <div data-testid="location">{location.pathname}</div>
    }

    function TestComponent() {
      useAuthInitializer()
      return null
    }

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestComponent />} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
        <LocationDisplay />
      </MemoryRouter>,
    )

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/login'),
    )
  })

  it('토큰 없이 시작해도 refresh를 통해 인증 상태가 복구된다 (페이지 새로고침 시나리오)', async () => {
    server.use(
      http.get(`${BASE_URL}/api/users/me`, ({ request }) => {
        const auth = request.headers.get('authorization')
        if (!auth) return new HttpResponse(null, { status: 401 })
        return HttpResponse.json({ success: true, data: mockUser })
      }),
      http.post(`${BASE_URL}/api/auth/refresh`, () =>
        HttpResponse.json({ success: true, data: { accessToken: 'refreshed-token' } }),
      ),
    )

    const { result } = renderHook(() => useAuthInitializer(), { wrapper })
    await waitFor(() => expect(result.current.isInitializing).toBe(false))
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })
})
