import type { TodoFilter } from '@/types/todo.types'

export const todoKeys = {
  all: ['todos'] as const,
  list: (filter: TodoFilter) => ['todos', 'list', filter] as const,
  detail: (id: string) => ['todos', 'detail', id] as const,
}

export const categoryKeys = {
  all: ['categories'] as const,
  list: () => ['categories', 'list'] as const,
}
