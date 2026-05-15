export interface Todo {
  id: string;
  userId: string;
  categoryId: string;
  title: string;
  description: string | null;
  startDate: string | null;
  dueDate: string | null;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TodoFilter {
  categoryId?: string;
  isCompleted?: boolean;
  overdue?: boolean;
}

export interface CreateTodoRequest {
  categoryId: string;
  title: string;
  description?: string;
  start_date?: string;
  due_date?: string;
}

export interface UpdateTodoRequest {
  categoryId?: string;
  title?: string;
  description?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  is_completed?: boolean;
}
