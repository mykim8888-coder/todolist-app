import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { useCreateTodo } from '@/hooks/useCreateTodo'
import { useUpdateTodo } from '@/hooks/useUpdateTodo'
import { useCategories } from '@/hooks/useCategories'
import { useUiStore } from '@/stores/ui.store'
import type { Todo, CreateTodoRequest, UpdateTodoRequest } from '@/types/todo.types'

const todoSchema = z
  .object({
    title: z.string().min(1, '제목을 입력해 주세요.').max(200, '제목은 200자 이내로 입력해 주세요.'),
    categoryId: z.string().min(1, '카테고리를 선택해 주세요.'),
    description: z.string().max(1000, '설명은 1000자 이내로 입력해 주세요.').optional(),
    startDate: z.string().optional(),
    dueDate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.dueDate && data.dueDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `종료 예정일은 시작일(${data.startDate}) 이후여야 합니다.`,
        path: ['dueDate'],
      })
    }
  })

type TodoFormData = z.infer<typeof todoSchema>

interface TodoFormProps {
  todo?: Todo
  onSuccess?: () => void
}

export default function TodoForm({ todo, onSuccess }: TodoFormProps) {
  const navigate = useNavigate()
  const showToast = useUiStore((s) => s.showToast)
  const isEditMode = !!todo

  const { data: categories = [], isLoading: isCategoriesLoading } = useCategories()
  const createTodo = useCreateTodo({
    onSuccess: () => {
      showToast(isEditMode ? '할일이 수정되었습니다.' : '할일이 등록되었습니다.', 'success')
      onSuccess?.()
      navigate('/')
    },
  })
  const updateTodo = useUpdateTodo({
    onSuccess: () => {
      showToast('할일이 수정되었습니다.', 'success')
      onSuccess?.()
      navigate('/')
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TodoFormData>({
    resolver: zodResolver(todoSchema),
    defaultValues: {
      title: todo?.title || '',
      categoryId: todo?.categoryId || '',
      description: todo?.description || '',
      startDate: todo?.startDate || '',
      dueDate: todo?.dueDate || '',
    },
  })

  const isSubmitting = createTodo.isPending || updateTodo.isPending

  const onSubmit = (data: TodoFormData) => {
    const requestData = {
      title: data.title,
      categoryId: data.categoryId,
      description: data.description || undefined,
      start_date: data.startDate || undefined,
      due_date: data.dueDate || undefined,
    }

    if (isEditMode && todo) {
      updateTodo.mutate({ id: todo.id, body: requestData as UpdateTodoRequest })
    } else {
      createTodo.mutate(requestData as CreateTodoRequest)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="title" className="label">
          제목 <span className="text-red-500">*</span>
        </label>
        <Input
          id="title"
          {...register('title')}
          placeholder="할일 제목을 입력하세요"
          error={errors.title?.message}
        />
      </div>

      <div>
        <label htmlFor="categoryId" className="label">
          카테고리 <span className="text-red-500">*</span>
        </label>
        <select
          id="categoryId"
          {...register('categoryId')}
          className={`input-field ${errors.categoryId ? 'input-error' : ''}`}
          aria-invalid={errors.categoryId ? 'true' : 'false'}
        >
          <option value="">카테고리 선택</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p className="error-message" role="alert">
            {errors.categoryId.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="label">
          설명
        </label>
        <textarea
          id="description"
          {...register('description')}
          placeholder="설명을 입력하세요 (선택사항)"
          rows={3}
          className={`input-field resize-none ${errors.description ? 'input-error' : ''}`}
        />
        {errors.description && (
          <p className="error-message" role="alert">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="label">
            시작일
          </label>
          <Input type="date" id="startDate" {...register('startDate')} />
        </div>
        <div>
          <label htmlFor="dueDate" className="label">
            종료 예정일
          </label>
          <Input
            type="date"
            id="dueDate"
            {...register('dueDate')}
            error={errors.dueDate?.message}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={() => navigate('/')}>
          취소
        </Button>
        <Button type="submit" disabled={isSubmitting || isCategoriesLoading}>
          {isSubmitting
            ? isEditMode
              ? '수정 중...'
              : '등록 중...'
            : isEditMode
              ? '수정 저장하기'
              : '저장하기'}
        </Button>
      </div>
    </form>
  )
}