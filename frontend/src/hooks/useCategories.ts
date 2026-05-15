import { useQuery } from '@tanstack/react-query'
import { getCategories } from '@/api/category.api'
import { categoryKeys } from '@/api/queryKeys'

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: getCategories,
  })
}
