import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { login } from '@/api/auth.api'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import type { LoginRequest } from '@/types/auth.types'

export function useLogin() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (body: LoginRequest) => login(body),
    onSuccess: (data) => {
      useAuthStore.getState().setAuth(data.accessToken, data.user)
      navigate('/')
    },
    onError: (error: unknown) => {
      let message = '로그인에 실패했습니다.'
      if (isAxiosError(error)) {
        message = error.response?.data?.error?.message ?? message
      }
      useUiStore.getState().showToast(message, 'error')
    },
  })
}
