import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { useCreateCategory } from '@/hooks/useCreateCategory'
import { useCategories } from '@/hooks/useCategories'

export function CategoryForm() {
  const { data: categories = [] } = useCategories()
  const { mutate: createCategory, isPending } = useCreateCategory()

  const schema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .min(1, '카테고리 이름을 입력해주세요.')
          .refine(
            (name) => !categories.some((c) => c.isDefault && c.name === name.trim()),
            '기본 카테고리와 동일한 이름은 사용할 수 없습니다.',
          ),
      }),
    [categories],
  )

  type FormValues = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = (values: FormValues) => {
    createCategory({ name: values.name.trim() }, { onSuccess: () => reset() })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2 items-start">
      <div className="flex-1">
        <Input
          id="category-name"
          placeholder="새 카테고리 이름"
          error={errors.name?.message}
          {...register('name')}
        />
      </div>
      <Button type="submit" loading={isPending} size="md" className="shrink-0 mt-0">
        <Plus size={16} />
        추가
      </Button>
    </form>
  )
}
