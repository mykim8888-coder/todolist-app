import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTodo } from '@/api/todo.api'
import { todoKeys } from '@/api/queryKeys'
import type { Todo, TodoFilter, UpdateTodoRequest } from '@/types/todo.types'
import { useUiStore } from '@/stores/ui.store'

interface UpdateTodoVariables {
  id: string
  body: UpdateTodoRequest
  filter?: TodoFilter
}

interface UseUpdateTodoOptions {
  onSuccess?: () => void
}

export function useUpdateTodo(options?: UseUpdateTodoOptions) {
  const queryClient = useQueryClient()
  const showToast = useUiStore((s) => s.showToast)

  return useMutation({
    mutationFn: ({ id, body }: UpdateTodoVariables) => updateTodo(id, body),
    onMutate: async ({ id, body, filter = {} }) => {
      const queryKey = todoKeys.list(filter)
      await queryClient.cancelQueries({ queryKey })
      const previousTodos = queryClient.getQueryData<Todo[]>(queryKey)

      if (previousTodos && body.is_completed !== undefined) {
        queryClient.setQueryData<Todo[]>(queryKey, (old) =>
          old?.map((t) => (t.id === id ? { ...t, isCompleted: body.is_completed! } : t)),
        )
      }

      return { previousTodos, queryKey }
    },
    onSuccess: () => {
      options?.onSuccess?.()
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(context.queryKey, context.previousTodos)
      }
      showToast('할일 수정에 실패했습니다.', 'error')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.all })
    },
  })
}
