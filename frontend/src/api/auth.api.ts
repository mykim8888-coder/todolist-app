import apiClient from './client'
import type { LoginRequest, LoginResponse, SignupRequest } from '@/types/auth.types'
import type { User } from '@/types/user.types'
import type { ApiResponse } from '@/types/api.types'

export async function login(body: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/api/auth/login', body)
  return data.data
}

export async function signup(body: SignupRequest): Promise<User> {
  const { data } = await apiClient.post<ApiResponse<User>>('/api/auth/signup', body)
  return data.data
}

export async function logout(): Promise<void> {
  await apiClient.post('/api/auth/logout')
}

export async function refreshToken(): Promise<string> {
  const { data } = await apiClient.post<ApiResponse<{ accessToken: string }>>('/api/auth/refresh')
  return data.data.accessToken
}
