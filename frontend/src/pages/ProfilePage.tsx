import { Layout } from '@/components/Layout'
import { ProfileForm } from '@/features/profile/ProfileForm'
import { PasswordForm } from '@/features/profile/PasswordForm'
import { DeleteAccountSection } from '@/features/profile/DeleteAccountSection'
import { useAuthStore } from '@/stores/auth.store'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)

  return (
    <Layout>
      <div className="max-w-content mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">내 정보 수정</h1>
        {user?.email && (
          <p className="text-sm text-gray-500 mb-6">{user.email}</p>
        )}

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">이름 수정</h2>
          <ProfileForm />
        </section>

        <hr className="border-gray-200 mb-8" />

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">비밀번호 변경</h2>
          <PasswordForm />
        </section>

        <hr className="border-gray-200 mb-8" />

        <section className="mb-8">
          <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6">
            <h2 className="text-base font-semibold text-red-600 mb-1">위험 영역</h2>
            <hr className="border-red-200 mb-4" />
            <DeleteAccountSection />
          </div>
        </section>
      </div>
    </Layout>
  )
}
