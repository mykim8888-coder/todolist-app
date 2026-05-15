import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { updateMe } from '@/api/user.api'
import { useUiStore } from '@/stores/ui.store'
import type { UpdateProfileRequest } from '@/types/user.types'

export function useUpdatePassword() {
  const showToast = useUiStore((s) => s.showToast)

  return useMutation({
    mutationFn: (body: Pick<UpdateProfileRequest, 'currentPassword' | 'newPassword'>) =>
      updateMe(body),
    onSuccess: () => {
      showToast('비밀번호가 변경되었습니다.', 'success')
    },
    onError: (error: unknown) => {
      let message = '비밀번호 변경에 실패했습니다.'
      if (isAxiosError(error) && error.response?.status === 401) {
        message = '현재 비밀번호가 올바르지 않습니다.'
      } else if (isAxiosError(error)) {
        message = error.response?.data?.error?.message ?? message
      }
      showToast(message, 'error')
    },
  })
}
