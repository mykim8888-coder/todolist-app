import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ToastContainer } from '@/components/ToastContainer'
import { useUiStore } from '@/stores/ui.store'

function resetUiStore() {
  useUiStore.setState({ toastQueue: [], isModalOpen: false, modalContent: null })
}

describe('ToastContainer', () => {
  beforeEach(() => {
    resetUiStore()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('toastQueue가 비어있으면 toast를 렌더링하지 않는다', () => {
    render(<ToastContainer />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('showToast 호출 시 toast 메시지가 렌더링된다', () => {
    render(<ToastContainer />)
    act(() => {
      useUiStore.getState().showToast('성공했습니다', 'success')
    })
    expect(screen.getByText('성공했습니다')).toBeInTheDocument()
  })

  it('error variant toast가 렌더링된다', () => {
    render(<ToastContainer />)
    act(() => {
      useUiStore.getState().showToast('오류 발생', 'error')
    })
    expect(screen.getByText('오류 발생')).toBeInTheDocument()
  })

  it('닫기 버튼 클릭 시 toast가 제거된다', () => {
    render(<ToastContainer />)
    act(() => {
      useUiStore.getState().showToast('닫기 테스트', 'info')
    })
    const closeBtn = screen.getByRole('button', { name: '닫기' })
    fireEvent.click(closeBtn)
    expect(screen.queryByText('닫기 테스트')).not.toBeInTheDocument()
  })

  it('3000ms 후 toast가 자동 제거된다', () => {
    render(<ToastContainer />)
    act(() => {
      useUiStore.getState().showToast('자동 소멸', 'warning')
    })
    expect(screen.getByText('자동 소멸')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.queryByText('자동 소멸')).not.toBeInTheDocument()
  })

  it('여러 toast가 동시에 표시된다', () => {
    render(<ToastContainer />)
    act(() => {
      useUiStore.getState().showToast('첫 번째', 'success')
      useUiStore.getState().showToast('두 번째', 'error')
    })
    expect(screen.getByText('첫 번째')).toBeInTheDocument()
    expect(screen.getByText('두 번째')).toBeInTheDocument()
  })

  it('ui.store의 toastQueue 변경에 반응하여 렌더링된다', () => {
    render(<ToastContainer />)
    expect(screen.queryByText('반응 테스트')).not.toBeInTheDocument()

    act(() => {
      useUiStore.getState().showToast('반응 테스트', 'info')
    })
    expect(screen.getByText('반응 테스트')).toBeInTheDocument()
  })
})
