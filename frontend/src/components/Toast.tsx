import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import type { FC } from 'react'
import type { Toast as ToastType, ToastVariant } from '@/stores/ui.store'
import { useUiStore } from '@/stores/ui.store'

interface ToastProps {
  toast: ToastType
}

type VariantConfig = {
  className: string
  Icon: typeof CheckCircle2
  ariaLive: 'assertive' | 'polite'
}

const variantConfig: Record<ToastVariant, VariantConfig> = {
  success: {
    className: 'bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800',
    Icon: CheckCircle2,
    ariaLive: 'polite',
  },
  error: {
    className: 'bg-red-50 border-l-4 border-red-500 text-red-800',
    Icon: AlertCircle,
    ariaLive: 'assertive',
  },
  warning: {
    className: 'bg-amber-50 border-l-4 border-amber-400 text-amber-800',
    Icon: AlertTriangle,
    ariaLive: 'polite',
  },
  info: {
    className: 'bg-violet-50 border-l-4 border-violet-500 text-violet-800',
    Icon: Info,
    ariaLive: 'polite',
  },
}

export const Toast: FC<ToastProps> = ({ toast }) => {
  const dismissToast = useUiStore((s) => s.dismissToast)
  const config = variantConfig[toast.variant]

  return (
    <div
      role="alert"
      aria-live={config.ariaLive}
      className={`flex items-center gap-3 max-w-[360px] px-4 py-3 rounded-lg shadow-lg animate-[slideIn_0.25s_ease-out] ${config.className}`}
    >
      <config.Icon size={16} className="shrink-0" aria-hidden="true" />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => dismissToast(toast.id)}
        aria-label="닫기"
        className="shrink-0 p-0.5 rounded hover:opacity-70 transition-opacity"
      >
        <X size={16} />
      </button>
    </div>
  )
}
