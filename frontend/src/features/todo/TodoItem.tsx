import { useState, type FC } from 'react'
import { Pencil, Trash2, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Todo } from '@/types/todo.types'
import type { Category } from '@/types/category.types'
import type { TodoFilter } from '@/types/todo.types'
import { Badge } from '@/components/Badge'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/Button'
import { isOverdue } from '@/utils/dateUtils'
import { useUpdateTodo } from '@/hooks/useUpdateTodo'
import { useDeleteTodo } from '@/hooks/useDeleteTodo'

interface Props {
  todo: Todo
  categories: Category[]
  filter?: TodoFilter
}

const CATEGORY_COLORS = [
  'text-violet-600 bg-violet-50',
  'text-emerald-600 bg-emerald-50',
  'text-sky-600 bg-sky-50',
  'text-orange-600 bg-orange-50',
  'text-pink-600 bg-pink-50',
  'text-teal-600 bg-teal-50',
  'text-amber-600 bg-amber-50',
  'text-indigo-600 bg-indigo-50',
]

function getCategoryColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length]
}

export const TodoItem: FC<Props> = ({ todo, categories, filter }) => {
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { mutate: updateTodo, isPending: isToggling } = useUpdateTodo()
  const { mutate: deleteTodo, isPending: isDeleting } = useDeleteTodo()

  const category = categories.find((c) => c.id === todo.categoryId)
  const overdue = isOverdue(todo.dueDate)

  const handleToggle = () => {
    updateTodo({ id: todo.id, body: { is_completed: !todo.isCompleted }, ...(filter !== undefined ? { filter } : {}) })
  }

  const handleDeleteConfirm = () => {
    deleteTodo(todo.id, { onSettled: () => setConfirmDelete(false) })
  }

  return (
    <>
      <li
        className={`flex items-start gap-3 py-4 px-4 border-b border-gray-200 transition-colors group ${
          overdue && !todo.isCompleted ? 'bg-amber-50' : 'bg-white hover:bg-gray-50'
        }`}
      >
        <button
          role="checkbox"
          aria-checked={todo.isCompleted}
          aria-label="할일 완료 토글"
          onClick={handleToggle}
          disabled={isToggling}
          className={`mt-0.5 flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-colors ${
            todo.isCompleted
              ? 'bg-emerald-500 border-emerald-500'
              : 'border-gray-300 hover:border-violet-400'
          }`}
        >
          {todo.isCompleted && (
            <svg viewBox="0 0 12 10" fill="none" className="w-3 h-3">
              <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={`text-[15px] leading-snug break-words ${
              todo.isCompleted ? 'line-through text-gray-400' : 'text-gray-900'
            }`}
          >
            {todo.title}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {todo.dueDate && (
              <span
                className={`flex items-center gap-1 text-xs ${
                  overdue && !todo.isCompleted ? 'text-amber-600' : 'text-gray-400'
                }`}
              >
                {overdue && !todo.isCompleted && <Clock size={12} />}
                {todo.dueDate}
              </span>
            )}
            {category && (
              <span
                className={`inline-flex items-center h-[22px] px-2 rounded-full text-xs font-medium tracking-wide ${getCategoryColor(category.id)}`}
              >
                {category.name}
              </span>
            )}
            {overdue && !todo.isCompleted && (
              <Badge variant="warning">기간 만료</Badge>
            )}
          </div>
        </div>

        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            aria-label={`${todo.title} 수정`}
            onClick={() => navigate(`/todos/${todo.id}/edit`)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            aria-label={`${todo.title} 삭제`}
            onClick={() => setConfirmDelete(true)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </li>

      <Modal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="할일 삭제"
      >
        <p className="text-sm text-gray-600 mb-6">
          <strong className="text-gray-900">{todo.title}</strong>을(를) 삭제하시겠습니까?
        </p>
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
            취소
          </Button>
          <Button variant="danger" size="sm" loading={isDeleting} onClick={handleDeleteConfirm}>
            삭제
          </Button>
        </div>
      </Modal>
    </>
  )
}
