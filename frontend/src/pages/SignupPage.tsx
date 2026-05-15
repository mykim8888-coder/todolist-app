import { SignupForm } from '@/features/auth/SignupForm'

export default function SignupPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">회원가입</h1>
        <SignupForm />
      </div>
    </div>
  )
}
