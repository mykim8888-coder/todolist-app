import type { Category } from '@/types/category.types'
import type { Todo } from '@/types/todo.types'

export interface CategoryRaw {
  id: string
  user_id: string | null
  name: string
  is_default: boolean
  created_at: string
}

export interface TodoRaw {
  id: string
  user_id: string
  category_id: string
  title: string
  description: string | null
  start_date: string | null
  due_date: string | null
  is_completed: boolean
  created_at: string
  updated_at: string
}

export function mapCategory(raw: CategoryRaw): Category {
  return {
    id: raw.id,
    userId: raw.user_id,
    name: raw.name,
    isDefault: raw.is_default,
    createdAt: raw.created_at,
  }
}

export function mapTodo(raw: TodoRaw): Todo {
  return {
    id: raw.id,
    userId: raw.user_id,
    categoryId: raw.category_id,
    title: raw.title,
    description: raw.description,
    startDate: raw.start_date,
    dueDate: raw.due_date,
    isCompleted: raw.is_completed,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}
