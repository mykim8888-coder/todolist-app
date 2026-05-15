import apiClient from './client'
import type { Todo, TodoFilter, CreateTodoRequest, UpdateTodoRequest } from '@/types/todo.types'
import type { ApiResponse } from '@/types/api.types'
import { mapTodo, type TodoRaw } from './mappers'

export async function getTodos(filter?: TodoFilter): Promise<Todo[]> {
  const { data } = await apiClient.get<ApiResponse<TodoRaw[]>>('/api/todos', { params: filter })
  return data.data.map(mapTodo)
}

export async function getTodo(id: string): Promise<Todo> {
  const { data } = await apiClient.get<ApiResponse<TodoRaw>>(`/api/todos/${id}`)
  return mapTodo(data.data)
}

export async function createTodo(body: CreateTodoRequest): Promise<Todo> {
  const { data } = await apiClient.post<ApiResponse<TodoRaw>>('/api/todos', body)
  return mapTodo(data.data)
}

export async function updateTodo(id: string, body: UpdateTodoRequest): Promise<Todo> {
  const { data } = await apiClient.patch<ApiResponse<TodoRaw>>(`/api/todos/${id}`, body)
  return mapTodo(data.data)
}

export async function deleteTodo(id: string): Promise<void> {
  await apiClient.delete(`/api/todos/${id}`)
}
