import { useState, type FC } from 'react'
import { Trash2 } from 'lucide-react'
import type { Category } from '@/types/category.types'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/Button'
import { useDeleteCategory } from '@/hooks/useDeleteCategory'

interface Props {
  categories: Category[]
}

export const CategoryList: FC<Props> = ({ categories }) => {
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const { mutate: deleteCategory, isPending } = useDeleteCategory()

  const handleConfirm = () => {
    if (!deletingCategory) return
    deleteCategory(deletingCategory.id, {
      onSettled: () => setDeletingCategory(null),
    })
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {categories.map((category) => (
          <li
            key={category.id}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-gray-200 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{category.name}</span>
              {category.isDefault && (
                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">기본</span>
              )}
            </div>
            <button
              type="button"
              disabled={category.isDefault}
              aria-disabled={category.isDefault}
              aria-label={`${category.name} 삭제`}
              title={
                category.isDefault
                  ? '기본 카테고리는 삭제할 수 없습니다'
                  : `${category.name} 삭제`
              }
              onClick={() => !category.isDefault && setDeletingCategory(category)}
              className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>

      <Modal
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        title="카테고리 삭제"
      >
        <p className="text-sm text-gray-600 mb-2">
          <strong className="text-gray-900">{deletingCategory?.name}</strong> 카테고리를 삭제하시겠습니까?
        </p>
        <p className="text-xs text-gray-400 mb-6">소속 할일은 기본 카테고리로 이동됩니다.</p>
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <Button variant="secondary" size="sm" onClick={() => setDeletingCategory(null)}>
            취소
          </Button>
          <Button variant="danger" size="sm" loading={isPending} onClick={handleConfirm}>
            삭제
          </Button>
        </div>
      </Modal>
    </>
  )
}
