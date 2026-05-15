import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Spinner } from '@/components/Spinner'

describe('Spinner', () => {
  it('role="status"가 설정된다', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('aria-label="로딩 중"이 설정된다', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', '로딩 중')
  })

  it('sm 크기로 렌더링된다', () => {
    render(<Spinner size="sm" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('md 크기(기본값)로 렌더링된다', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('lg 크기로 렌더링된다', () => {
    render(<Spinner size="lg" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
