import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '@/components/Button'

describe('Button', () => {
  it('기본(primary) variant로 렌더링된다', () => {
    render(<Button>클릭</Button>)
    expect(screen.getByRole('button', { name: '클릭' })).toBeInTheDocument()
  })

  it('loading/disabled 아닐 때 onClick이 호출된다', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>클릭</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('loading 상태에서 button이 disabled 처리된다', () => {
    render(<Button loading>저장</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('loading 상태에서 클릭해도 onClick이 호출되지 않는다', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button loading onClick={onClick}>저장</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('loading 상태에서 Spinner가 표시된다', () => {
    render(<Button loading>저장</Button>)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('loading 상태에서 aria-disabled="true"가 설정된다', () => {
    render(<Button loading>저장</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true')
  })

  it('disabled prop 적용 시 클릭 이벤트가 발생하지 않는다', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>버튼</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('secondary variant로 렌더링된다', () => {
    render(<Button variant="secondary">취소</Button>)
    expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument()
  })

  it('danger variant로 렌더링된다', () => {
    render(<Button variant="danger">삭제</Button>)
    expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument()
  })

  it('ghost variant로 렌더링된다', () => {
    render(<Button variant="ghost">필터 초기화</Button>)
    expect(screen.getByRole('button', { name: '필터 초기화' })).toBeInTheDocument()
  })

  it('loading 없을 때 Spinner가 표시되지 않는다', () => {
    render(<Button>저장</Button>)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
