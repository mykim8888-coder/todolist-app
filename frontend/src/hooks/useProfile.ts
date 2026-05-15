import { useQuery } from '@tanstack/react-query'
import { getMe } from '@/api/user.api'

export function useProfile() {
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: getMe,
  })
}
