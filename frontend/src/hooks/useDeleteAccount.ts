import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { deleteMe } from '@/api/user.api'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import type { DeleteAccountRequest } from '@/types/user.types'

export function useDeleteAccount() {
  const navigate = useNavigate()
  const showToast = useUiStore((s) => s.showToast)

  return useMutation({
    mutationFn: (body: DeleteAccountRequest) => deleteMe(body),
    onSuccess: () => {
      useAuthStore.getState().clearAuth()
      navigate('/login')
    },
    onError: (error: unknown) => {
      let message = '회원 탈퇴에 실패했습니다.'
      if (isAxiosError(error) && error.response?.status === 401) {
        message = '비밀번호가 올바르지 않습니다.'
      } else if (isAxiosError(error)) {
        message = error.response?.data?.error?.message ?? message
      }
      showToast(message, 'error')
    },
  })
}
