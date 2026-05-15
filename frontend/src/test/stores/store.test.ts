import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import type { User } from '@/types/user.types'

const mockUser: User = {
  id: 'user-uuid',
  name: 'Test User',
  email: 'test@test.com',
  auth_provider: 'local',
  created_at: '2026-05-14T00:00:00Z',
  updated_at: '2026-05-14T00:00:00Z',
}

function resetAuthStore() {
  useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
}

function resetUiStore() {
  useUiStore.setState({ toastQueue: [], isModalOpen: false, modalContent: null })
}

describe('auth.store', () => {
  beforeEach(() => {
    resetAuthStore()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('초기 상태는 accessToken, user가 null이고 isAuthenticated는 false', () => {
    const state = useAuthStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('setAuth 호출 시 accessToken, user, isAuthenticated가 설정된다', () => {
    useAuthStore.getState().setAuth('my-token', mockUser)
    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('my-token')
    expect(state.user).toEqual(mockUser)
    expect(state.isAuthenticated).toBe(true)
  })

  it('clearAuth 호출 시 accessToken, user가 null로 초기화된다', () => {
    useAuthStore.getState().setAuth('my-token', mockUser)
    useAuthStore.getState().clearAuth()
    const state = useAuthStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('setAccessToken 호출 시 accessToken만 갱신되고 user, isAuthenticated는 유지된다', () => {
    useAuthStore.getState().setAuth('old-token', mockUser)
    useAuthStore.getState().setAccessToken('new-token')
    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('new-token')
    expect(state.user).toEqual(mockUser)
    expect(state.isAuthenticated).toBe(true)
  })

  it('accessToken이 localStorage에 저장되지 않는다 (메모리 전용)', () => {
    useAuthStore.getState().setAuth('secret-token', mockUser)
    expect(localStorage.length).toBe(0)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!
      expect(localStorage.getItem(key)).not.toContain('secret-token')
    }
  })

  it('accessToken이 sessionStorage에 저장되지 않는다 (메모리 전용)', () => {
    useAuthStore.getState().setAuth('secret-token', mockUser)
    expect(sessionStorage.length).toBe(0)
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)!
      expect(sessionStorage.getItem(key)).not.toContain('secret-token')
    }
  })

  it('clearAuth 후 재인증 시 상태가 정상 설정된다', () => {
    useAuthStore.getState().setAuth('token1', mockUser)
    useAuthStore.getState().clearAuth()
    useAuthStore.getState().setAuth('token2', mockUser)
    expect(useAuthStore.getState().accessToken).toBe('token2')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })
})

describe('ui.store — Toast', () => {
  beforeEach(() => {
    resetUiStore()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('초기 toastQueue는 빈 배열이다', () => {
    expect(useUiStore.getState().toastQueue).toEqual([])
  })

  it('showToast 호출 시 toastQueue에 toast가 추가된다', () => {
    useUiStore.getState().showToast('성공 메시지', 'success')
    const { toastQueue } = useUiStore.getState()
    expect(toastQueue).toHaveLength(1)
    expect(toastQueue[0].message).toBe('성공 메시지')
    expect(toastQueue[0].variant).toBe('success')
    expect(toastQueue[0].id).toBeDefined()
  })

  it('showToast variant 기본값은 info이다', () => {
    useUiStore.getState().showToast('기본값 테스트')
    expect(useUiStore.getState().toastQueue[0].variant).toBe('info')
  })

  it('showToast 후 3000ms가 지나면 toast가 자동 제거된다', () => {
    useUiStore.getState().showToast('자동 소멸', 'info')
    expect(useUiStore.getState().toastQueue).toHaveLength(1)

    vi.advanceTimersByTime(3000)

    expect(useUiStore.getState().toastQueue).toHaveLength(0)
  })

  it('3000ms 이전에는 toast가 toastQueue에 남아있다', () => {
    useUiStore.getState().showToast('아직 남아있음', 'warning')
    vi.advanceTimersByTime(2999)
    expect(useUiStore.getState().toastQueue).toHaveLength(1)
  })

  it('dismissToast 호출 시 해당 id의 toast만 제거된다', () => {
    useUiStore.getState().showToast('toast1', 'success')
    useUiStore.getState().showToast('toast2', 'error')
    const { toastQueue } = useUiStore.getState()
    expect(toastQueue).toHaveLength(2)

    useUiStore.getState().dismissToast(toastQueue[0].id)

    const updated = useUiStore.getState().toastQueue
    expect(updated).toHaveLength(1)
    expect(updated[0].message).toBe('toast2')
  })

  it('여러 toast를 동시에 관리할 수 있다', () => {
    useUiStore.getState().showToast('toast1', 'success')
    useUiStore.getState().showToast('toast2', 'error')
    useUiStore.getState().showToast('toast3', 'warning')
    expect(useUiStore.getState().toastQueue).toHaveLength(3)

    vi.advanceTimersByTime(3000)
    expect(useUiStore.getState().toastQueue).toHaveLength(0)
  })

  it('각 toast는 고유한 id를 가진다', () => {
    useUiStore.getState().showToast('a', 'info')
    useUiStore.getState().showToast('b', 'info')
    const { toastQueue } = useUiStore.getState()
    expect(toastQueue[0].id).not.toBe(toastQueue[1].id)
  })
})

describe('ui.store — Modal', () => {
  beforeEach(() => {
    resetUiStore()
  })

  it('초기 상태는 isModalOpen이 false이고 modalContent가 null이다', () => {
    const state = useUiStore.getState()
    expect(state.isModalOpen).toBe(false)
    expect(state.modalContent).toBeNull()
  })

  it('openModal 호출 시 isModalOpen이 true가 되고 modalContent가 설정된다', () => {
    useUiStore.getState().openModal('모달 내용')
    const state = useUiStore.getState()
    expect(state.isModalOpen).toBe(true)
    expect(state.modalContent).toBe('모달 내용')
  })

  it('closeModal 호출 시 isModalOpen이 false가 되고 modalContent가 null로 초기화된다', () => {
    useUiStore.getState().openModal('모달 내용')
    useUiStore.getState().closeModal()
    const state = useUiStore.getState()
    expect(state.isModalOpen).toBe(false)
    expect(state.modalContent).toBeNull()
  })

  it('openModal을 여러 번 호출해도 마지막 content가 반영된다', () => {
    useUiStore.getState().openModal('첫 번째')
    useUiStore.getState().openModal('두 번째')
    expect(useUiStore.getState().modalContent).toBe('두 번째')
    expect(useUiStore.getState().isModalOpen).toBe(true)
  })
})
