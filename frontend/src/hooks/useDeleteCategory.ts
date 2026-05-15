import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { deleteCategory } from '@/api/category.api'
import { categoryKeys, todoKeys } from '@/api/queryKeys'
import { useUiStore } from '@/stores/ui.store'

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  const showToast = useUiStore((s) => s.showToast)

  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      queryClient.invalidateQueries({ queryKey: todoKeys.all })
    },
    onError: (error: unknown) => {
      let message = '카테고리 삭제에 실패했습니다.'
      if (isAxiosError(error)) {
        message = error.response?.data?.error?.message ?? message
      }
      showToast(message, 'error')
    },
  })
}
