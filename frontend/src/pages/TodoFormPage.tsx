import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/Layout'
import TodoForm from '@/features/todo/TodoForm'
import { Spinner } from '@/components/Spinner'
import { getTodo } from '@/api/todo.api'
import { todoKeys } from '@/api/queryKeys'

export default function TodoFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditMode = !!id

  const {
    data: todo,
    isLoading,
    error,
  } = useQuery({
    queryKey: todoKeys.detail(id!),
    queryFn: () => getTodo(id!),
    enabled: isEditMode,
  })

  if (isEditMode && isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner size="lg" />
        </div>
      </Layout>
    )
  }

  if (isEditMode && error) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">할일을 불러올 수 없습니다.</p>
          <button onClick={() => navigate('/')} className="text-violet-600 hover:underline">
            할일 목록으로 돌아가기
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-content mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="min-h-[44px] flex items-center text-gray-500 hover:text-gray-700 text-sm gap-1"
          >
            ← 할일 목록으로 돌아가기
          </button>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">
          {isEditMode ? '할일 수정' : '새 할일 등록'}
        </h1>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <TodoForm todo={todo} />
        </div>
      </div>
    </Layout>
  )
}
