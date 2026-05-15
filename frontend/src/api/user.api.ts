import apiClient from './client'
import type { User, UpdateProfileRequest, DeleteAccountRequest } from '@/types/user.types'
import type { ApiResponse } from '@/types/api.types'

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<ApiResponse<User>>('/api/users/me')
  return data.data
}

export async function updateMe(body: UpdateProfileRequest): Promise<User> {
  const { data } = await apiClient.patch<ApiResponse<User>>('/api/users/me', body)
  return data.data
}

export async function deleteMe(body: DeleteAccountRequest): Promise<void> {
  await apiClient.delete('/api/users/me', { data: body })
}
