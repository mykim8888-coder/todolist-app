import { Layout } from '@/components/Layout'
import { Spinner } from '@/components/Spinner'
import { CategoryForm } from '@/features/category/CategoryForm'
import { CategoryList } from '@/features/category/CategoryList'
import { useCategories } from '@/hooks/useCategories'

export default function CategoryPage() {
  const { data: categories, isLoading } = useCategories()

  return (
    <Layout>
      <div className="max-w-content mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">카테고리 관리</h1>
        <div className="flex flex-col gap-4 max-w-lg">
          <CategoryForm />
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : (
            <CategoryList categories={categories ?? []} />
          )}
        </div>
      </div>
    </Layout>
  )
}
