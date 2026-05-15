import { createPortal } from 'react-dom'
import { useUiStore } from '@/stores/ui.store'
import { Toast } from './Toast'

export function ToastContainer() {
  const toastQueue = useUiStore((s) => s.toastQueue)

  if (toastQueue.length === 0) return null

  return createPortal(
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2">
      {toastQueue.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body,
  )
}
