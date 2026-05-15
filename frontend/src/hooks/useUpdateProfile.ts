import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { updateMe } from '@/api/user.api'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import type { UpdateProfileRequest } from '@/types/user.types'

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const showToast = useUiStore((s) => s.showToast)

  return useMutation({
    mutationFn: (body: Pick<UpdateProfileRequest, 'name'>) => updateMe(body),
    onSuccess: (updatedUser) => {
      const { accessToken } = useAuthStore.getState()
      if (accessToken) {
        useAuthStore.getState().setAuth(accessToken, updatedUser)
      }
      queryClient.setQueryData(['users', 'me'], updatedUser)
      showToast('이름이 수정되었습니다.', 'success')
    },
    onError: (error: unknown) => {
      let message = '정보 수정에 실패했습니다.'
      if (isAxiosError(error)) {
        message = error.response?.data?.error?.message ?? message
      }
      showToast(message, 'error')
    },
  })
}
