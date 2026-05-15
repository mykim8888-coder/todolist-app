import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Modal } from '@/components/Modal'

describe('Modal', () => {
  it('isOpen=true일 때 렌더링된다', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="테스트 모달">
        <p>모달 내용</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('모달 내용')).toBeInTheDocument()
  })

  it('isOpen=false일 때 렌더링되지 않는다', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="테스트 모달">
        <p>모달 내용</p>
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ESC 키 입력 시 onClose가 호출된다', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} title="테스트">
        <button>내부 버튼</button>
      </Modal>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('오버레이 클릭 시 onClose가 호출된다', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} title="테스트">
        내용
      </Modal>,
    )
    const overlay = screen.getByTestId('modal-overlay')
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('role="dialog"와 aria-modal="true"가 설정된다', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="테스트">
        내용
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('모달 패널 내부 클릭 시 onClose가 호출되지 않는다', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} title="테스트">
        <button>내부 버튼</button>
      </Modal>,
    )
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('title prop이 렌더링된다', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="모달 제목">
        내용
      </Modal>,
    )
    expect(screen.getByText('모달 제목')).toBeInTheDocument()
  })

  it('열렸을 때 포커스가 모달 내부로 이동한다', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="테스트">
        <button>내부 버튼</button>
      </Modal>,
    )
    expect(document.activeElement?.closest('[role="dialog"]')).not.toBeNull()
  })

  it('닫기 버튼 클릭 시 onClose가 호출된다', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} title="테스트">
        내용
      </Modal>,
    )
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('Tab 키 - 마지막 focusable 요소에서 Tab 시 첫 번째 요소로 포커스 이동한다', () => {
    render(
      <Modal isOpen onClose={vi.fn()}>
        <button>첫 번째 버튼</button>
        <button>마지막 버튼</button>
      </Modal>,
    )
    const buttons = screen.getAllByRole('button')
    const lastButton = buttons[buttons.length - 1]
    lastButton.focus()
    expect(document.activeElement).toBe(lastButton)

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false })
    expect(document.activeElement).toBe(buttons[0])
  })

  it('Shift+Tab - 첫 번째 focusable 요소에서 Shift+Tab 시 마지막 요소로 포커스 이동한다', () => {
    render(
      <Modal isOpen onClose={vi.fn()}>
        <button>첫 번째 버튼</button>
        <button>마지막 버튼</button>
      </Modal>,
    )
    const buttons = screen.getAllByRole('button')
    buttons[0].focus()
    expect(document.activeElement).toBe(buttons[0])

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(buttons[buttons.length - 1])
  })

  it('Tab 키 - focusable 요소가 없을 때 아무 일도 발생하지 않는다', () => {
    render(
      <Modal isOpen onClose={vi.fn()}>
        <p>포커스 불가 텍스트만</p>
      </Modal>,
    )
    expect(() => fireEvent.keyDown(document, { key: 'Tab' })).not.toThrow()
  })
})
