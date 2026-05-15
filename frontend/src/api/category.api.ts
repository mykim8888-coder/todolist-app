import apiClient from './client'
import type { Category, CreateCategoryRequest } from '@/types/category.types'
import type { ApiResponse } from '@/types/api.types'
import { mapCategory, type CategoryRaw } from './mappers'

export async function getCategories(): Promise<Category[]> {
  const { data } = await apiClient.get<ApiResponse<CategoryRaw[]>>('/api/categories')
  return data.data.map(mapCategory)
}

export async function createCategory(body: CreateCategoryRequest): Promise<Category> {
  const { data } = await apiClient.post<ApiResponse<CategoryRaw>>('/api/categories', body)
  return mapCategory(data.data)
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/api/categories/${id}`)
}
