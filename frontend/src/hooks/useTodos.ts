import { useQuery } from '@tanstack/react-query'
import { getTodos } from '@/api/todo.api'
import { todoKeys } from '@/api/queryKeys'
import type { TodoFilter } from '@/types/todo.types'

export function useTodos(filter: TodoFilter = {}) {
  return useQuery({
    queryKey: todoKeys.list(filter),
    queryFn: () => getTodos(filter),
    staleTime: 60_000,
  })
}
