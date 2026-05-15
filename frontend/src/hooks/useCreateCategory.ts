import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { createCategory } from '@/api/category.api'
import { categoryKeys } from '@/api/queryKeys'
import { useUiStore } from '@/stores/ui.store'
import type { CreateCategoryRequest } from '@/types/category.types'

export function useCreateCategory() {
  const queryClient = useQueryClient()
  const showToast = useUiStore((s) => s.showToast)

  return useMutation({
    mutationFn: (body: CreateCategoryRequest) => createCategory(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
    onError: (error: unknown) => {
      let message = '카테고리 생성에 실패했습니다.'
      if (isAxiosError(error) && error.response?.status === 409) {
        message = '이미 사용 중인 카테고리 이름입니다.'
      } else if (isAxiosError(error)) {
        message = error.response?.data?.error?.message ?? message
      }
      showToast(message, 'error')
    },
  })
}
