import dayjs from 'dayjs'

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return dayjs(dueDate).isBefore(dayjs(), 'day')
}
