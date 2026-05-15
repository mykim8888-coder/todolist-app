import type { FC } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Category } from '@/types/category.types'

interface Props {
  categories: Category[]
}

export const TodoFilter: FC<Props> = ({ categories }) => {
  const [searchParams, setSearchParams] = useSearchParams()

  const categoryId = searchParams.get('categoryId') ?? ''
  const isCompleted = searchParams.get('isCompleted') ?? ''
  const overdue = searchParams.get('overdue') === 'true'

  const update = (key: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value === null || value === '') {
        next.delete(key)
      } else {
        next.set(key, value)
      }
      return next
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      <select
        aria-label="카테고리 필터"
        value={categoryId}
        onChange={(e) => update('categoryId', e.target.value || null)}
        className="input-field w-auto min-w-[140px] h-9 text-sm"
      >
        <option value="">전체 카테고리</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isCompleted === 'true'}
          onChange={(e) => update('isCompleted', e.target.checked ? 'true' : null)}
          className="accent-violet-600"
        />
        완료된 항목
      </label>

      <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={overdue}
          onChange={(e) => update('overdue', e.target.checked ? 'true' : null)}
          className="accent-violet-600"
        />
        기간 만료
      </label>
    </div>
  )
}
