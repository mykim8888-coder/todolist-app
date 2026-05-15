import { useSearchParams, Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { TodoFilter } from '@/features/todo/TodoFilter'
import { TodoList } from '@/features/todo/TodoList'
import { useTodos } from '@/hooks/useTodos'
import { useCategories } from '@/hooks/useCategories'
import type { TodoFilter as TodoFilterType } from '@/types/todo.types'

export default function TodoListPage() {
  const [searchParams] = useSearchParams()
  const categories = useCategories()

  const filter: TodoFilterType = {}
  const categoryId = searchParams.get('categoryId')
  const isCompleted = searchParams.get('isCompleted')
  const overdue = searchParams.get('overdue')

  if (categoryId) filter.categoryId = categoryId
  if (isCompleted === 'true') filter.isCompleted = true
  else if (isCompleted === 'false') filter.isCompleted = false
  if (overdue === 'true') filter.overdue = true

  const { data: todos, isLoading } = useTodos(filter)

  return (
    <Layout>
      <div className="max-w-content mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900">할일 목록</h1>
          <Link
            to="/todos/new"
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg text-[13px] font-medium text-white bg-violet-600 hover:bg-violet-700 active:bg-violet-800 transition-colors"
          >
            <Plus size={16} />
            새 할일
          </Link>
        </div>

        <TodoFilter categories={categories.data ?? []} />

        <TodoList
          todos={todos}
          categories={categories.data ?? []}
          isLoading={isLoading}
          filter={filter}
        />
      </div>
    </Layout>
  )
}
