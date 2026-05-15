import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import React from 'react'
import { Input } from '@/components/Input'

describe('Input', () => {
  it('label과 input이 연결되어 렌더링된다', () => {
    render(<Input id="email" label="이메일" />)
    expect(screen.getByLabelText('이메일')).toBeInTheDocument()
  })

  it('error prop 전달 시 aria-invalid="true"가 설정된다', () => {
    render(<Input id="email" label="이메일" error="올바른 이메일을 입력하세요" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('error prop 전달 시 에러 메시지가 DOM에 렌더링된다', () => {
    render(<Input id="email" label="이메일" error="올바른 이메일을 입력하세요" />)
    expect(screen.getByText('올바른 이메일을 입력하세요')).toBeInTheDocument()
  })

  it('error 없을 때 aria-invalid="false"이다', () => {
    render(<Input id="email" label="이메일" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false')
  })

  it('error 없을 때 에러 메시지가 DOM에 없다', () => {
    render(<Input id="email" label="이메일" />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('error 있을 때 aria-describedby가 에러 메시지 id와 연결된다', () => {
    render(<Input id="email" label="이메일" error="에러 메시지" />)
    const input = screen.getByRole('textbox')
    const describedById = input.getAttribute('aria-describedby')
    expect(describedById).toBeTruthy()
    expect(document.getElementById(describedById!)).toHaveTextContent('에러 메시지')
  })

  it('error 없을 때 aria-describedby가 설정되지 않는다', () => {
    render(<Input id="email" label="이메일" />)
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-describedby')
  })

  it('forwardRef로 input 엘리먼트에 접근할 수 있다', () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<Input id="name" label="이름" ref={ref} />)
    expect(ref.current).not.toBeNull()
    expect(ref.current?.tagName).toBe('INPUT')
  })

  it('label 없이도 렌더링된다', () => {
    render(<Input id="search" placeholder="검색" />)
    expect(screen.getByPlaceholderText('검색')).toBeInTheDocument()
  })
})
