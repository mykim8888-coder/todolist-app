import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe } from '@/api/user.api'
import { useAuthStore } from '@/stores/auth.store'

export function useAuthInitializer() {
  const [isInitializing, setIsInitializing] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getMe()
      .then((user) => {
        const { accessToken, setAuth } = useAuthStore.getState()
        if (accessToken) {
          setAuth(accessToken, user)
        }
      })
      .catch(() => {
        // Public routes handle themselves; PrivateRoute redirects on private routes
      })
      .finally(() => {
        setIsInitializing(false)
      })
  }, [])

  return { isInitializing }
}
