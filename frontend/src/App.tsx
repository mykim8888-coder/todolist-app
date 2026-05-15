import { type FC, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { useAuthInitializer } from '@/hooks/useAuthInitializer'
import { Spinner } from '@/components/Spinner'
import { ToastContainer } from '@/components/ToastContainer'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import TodoListPage from '@/pages/TodoListPage'
import TodoFormPage from '@/pages/TodoFormPage'
import CategoryPage from '@/pages/CategoryPage'
import ProfilePage from '@/pages/ProfilePage'

export const PrivateRoute: FC<{ children: ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <>{children}</>
}

export const PublicRoute: FC<{ children: ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function AppRoutes() {
  const { isInitializing } = useAuthInitializer()

  if (isInitializing) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/" element={<PrivateRoute><TodoListPage /></PrivateRoute>} />
      <Route path="/todos/new" element={<PrivateRoute><TodoFormPage /></PrivateRoute>} />
      <Route path="/todos/:id/edit" element={<PrivateRoute><TodoFormPage /></PrivateRoute>} />
      <Route path="/categories" element={<PrivateRoute><CategoryPage /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <ToastContainer />
    </BrowserRouter>
  )
}
