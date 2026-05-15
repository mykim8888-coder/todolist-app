import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTodo } from '@/api/todo.api'
import { todoKeys } from '@/api/queryKeys'
import type { CreateTodoRequest } from '@/types/todo.types'
import { useUiStore } from '@/stores/ui.store'

interface UseCreateTodoOptions {
  onSuccess?: () => void
}

export function useCreateTodo(options?: UseCreateTodoOptions) {
  const queryClient = useQueryClient()
  const showToast = useUiStore((s) => s.showToast)

  return useMutation({
    mutationFn: (body: CreateTodoRequest) => createTodo(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.all })
      options?.onSuccess?.()
    },
    onError: () => {
      showToast('할일 등록에 실패했습니다.', 'error')
    },
  })
}