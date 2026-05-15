import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteTodo } from '@/api/todo.api'
import { todoKeys } from '@/api/queryKeys'
import { useUiStore } from '@/stores/ui.store'

export function useDeleteTodo() {
  const queryClient = useQueryClient()
  const showToast = useUiStore((s) => s.showToast)

  return useMutation({
    mutationFn: deleteTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.all })
      showToast('할일이 삭제되었습니다.', 'success')
    },
    onError: () => {
      showToast('할일 삭제에 실패했습니다.', 'error')
    },
  })
}
