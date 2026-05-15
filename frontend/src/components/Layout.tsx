import { type FC, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'

interface LayoutProps {
  children: ReactNode
}

const navLinks = [
  { to: '/', label: '할일목록' },
  { to: '/categories', label: '카테고리' },
  { to: '/profile', label: '내정보' },
]

export const Layout: FC<LayoutProps> = ({ children }) => {
  const { user, clearAuth } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-white pb-14 md:pb-0">
      <header className="sticky top-0 z-50 h-14 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-full px-4 xl:px-6">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-[18px] font-bold text-violet-600">
              TodoApp
            </Link>
            <nav className="hidden md:flex xl:hidden items-center gap-1" aria-label="메인 네비게이션">
              {navLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname === to
                      ? 'text-violet-700 bg-violet-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden md:block text-sm text-gray-600">{user.name}</span>
            )}
            <button
              onClick={handleLogout}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-sm text-gray-600 hover:text-gray-900 px-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className="hidden xl:flex xl:flex-col xl:w-60 xl:shrink-0 xl:fixed xl:top-14 xl:bottom-0 xl:bg-gray-50 xl:border-r xl:border-gray-200 xl:z-40 xl:overflow-y-auto"
        >
          <nav className="flex flex-col p-3 gap-1 pt-4" aria-label="사이드바 네비게이션">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === to
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-gray-600 hover:bg-white hover:shadow-sm hover:text-gray-900'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 xl:ml-60 px-4 md:px-5 xl:px-6 py-6">
          {children}
        </main>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 h-14 bg-white border-t border-gray-200 flex md:hidden"
        aria-label="하단 탭 네비게이션"
      >
        {navLinks.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`flex-1 flex items-center justify-center text-xs font-medium transition-colors ${
              location.pathname === to ? 'text-violet-600' : 'text-gray-400'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
