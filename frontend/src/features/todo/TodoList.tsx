import type { FC } from 'react'
import type { Todo, TodoFilter } from '@/types/todo.types'
import type { Category } from '@/types/category.types'
import { Spinner } from '@/components/Spinner'
import { TodoItem } from './TodoItem'

interface Props {
  todos: Todo[] | undefined
  categories: Category[]
  isLoading: boolean
  filter?: TodoFilter
}

export const TodoList: FC<Props> = ({ todos, categories, isLoading, filter }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="md" />
      </div>
    )
  }

  if (!todos || todos.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-gray-400">
        <p className="text-sm">할일이 없습니다.</p>
      </div>
    )
  }

  return (
    <ul aria-label="할일 목록">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} categories={categories} {...(filter !== undefined ? { filter } : {})} />
      ))}
    </ul>
  )
}
