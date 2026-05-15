import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from './mocks/server'
import { BASE_URL } from './mocks/handlers'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
}

describe('QueryClient 기본 설정', () => {
  it('staleTime이 60000ms(1분)으로 설정된다', () => {
    const qc = createTestQueryClient()
    const defaults = qc.getDefaultOptions().queries
    expect(defaults?.staleTime).toBe(60000)
  })

  it('retry가 1로 설정된다', () => {
    const qc = createTestQueryClient()
    const defaults = qc.getDefaultOptions().queries
    expect(defaults?.retry).toBe(1)
  })

  it('refetchOnWindowFocus가 false로 설정된다', () => {
    const qc = createTestQueryClient()
    const defaults = qc.getDefaultOptions().queries
    expect(defaults?.refetchOnWindowFocus).toBe(false)
  })

  it('staleTime 이내 재마운트 시 네트워크 요청이 1회만 발생한다', async () => {
    const fetchSpy = vi.fn()
    server.use(
      http.get(`${BASE_URL}/api/users/me`, () => {
        fetchSpy()
        return HttpResponse.json({ success: true, data: { id: '1', name: 'Test' } })
      }),
    )

    const queryClient = createTestQueryClient()

    function TestComponent() {
      const { data } = useQuery({
        queryKey: ['test-stale-users-me'],
        queryFn: async () => {
          const res = await fetch(`${BASE_URL}/api/users/me`)
          return res.json()
        },
      })
      return <div>{data ? 'loaded' : 'loading'}</div>
    }

    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>,
    )

    await waitFor(() => expect(screen.getByText('loaded')).toBeInTheDocument())
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    unmount()

    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>,
    )

    await waitFor(() => expect(screen.getByText('loaded')).toBeInTheDocument())
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('QueryClientProvider가 없으면 useQuery 사용 시 에러가 발생한다', () => {
    function BrokenComponent() {
      useQuery({ queryKey: ['test'], queryFn: () => Promise.resolve(null) })
      return null
    }

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<BrokenComponent />)).toThrow()
    consoleSpy.mockRestore()
  })
})
