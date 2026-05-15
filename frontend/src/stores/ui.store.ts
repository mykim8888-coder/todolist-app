import { create } from 'zustand'
import type { ReactNode } from 'react'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface UiState {
  toastQueue: Toast[]
  isModalOpen: boolean
  modalContent: ReactNode | null
  showToast: (message: string, variant?: ToastVariant) => void
  dismissToast: (id: string) => void
  openModal: (content: ReactNode) => void
  closeModal: () => void
}

export const useUiStore = create<UiState>((set) => ({
  toastQueue: [],
  isModalOpen: false,
  modalContent: null,
  showToast: (message, variant = 'info') => {
    const id = crypto.randomUUID()
    set((state) => ({ toastQueue: [...state.toastQueue, { id, message, variant }] }))
    setTimeout(() => {
      set((state) => ({ toastQueue: state.toastQueue.filter((t) => t.id !== id) }))
    }, 3000)
  },
  dismissToast: (id) =>
    set((state) => ({ toastQueue: state.toastQueue.filter((t) => t.id !== id) })),
  openModal: (content) => set({ isModalOpen: true, modalContent: content }),
  closeModal: () => set({ isModalOpen: false, modalContent: null }),
}))
