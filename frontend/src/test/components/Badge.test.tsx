import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Badge } from '@/components/Badge'

describe('Badge', () => {
  it('children을 렌더링한다', () => {
    render(<Badge>WORK</Badge>)
    expect(screen.getByText('WORK')).toBeInTheDocument()
  })

  it('default variant(기본값)로 렌더링된다', () => {
    render(<Badge>일반</Badge>)
    expect(screen.getByText('일반')).toBeInTheDocument()
  })

  it('success variant로 렌더링된다', () => {
    render(<Badge variant="success">완료</Badge>)
    expect(screen.getByText('완료')).toBeInTheDocument()
  })

  it('warning variant로 렌더링된다', () => {
    render(<Badge variant="warning">OVERDUE</Badge>)
    expect(screen.getByText('OVERDUE')).toBeInTheDocument()
  })

  it('danger variant로 렌더링된다', () => {
    render(<Badge variant="danger">오늘 마감</Badge>)
    expect(screen.getByText('오늘 마감')).toBeInTheDocument()
  })

  it('primary variant로 렌더링된다', () => {
    render(<Badge variant="primary">업무</Badge>)
    expect(screen.getByText('업무')).toBeInTheDocument()
  })
})
