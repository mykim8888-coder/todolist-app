import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { useLogin } from '@/hooks/useLogin'

const schema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력해주세요.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
})

type FormValues = z.infer<typeof schema>

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
  })

  const { mutate, isPending } = useLogin()

  return (
    <form onSubmit={handleSubmit((values) => mutate(values))} className="flex flex-col gap-4">
      <Input
        id="email"
        label="이메일"
        type="email"
        placeholder="이메일을 입력해주세요"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        id="password"
        label="비밀번호"
        type="password"
        placeholder="비밀번호를 입력해주세요"
        error={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" loading={isPending} className="w-full mt-2">
        로그인
      </Button>
      <p className="text-center text-sm text-gray-600">
        계정이 없으신가요?{' '}
        <Link to="/signup" className="text-violet-600 font-medium hover:text-violet-700">
          회원가입
        </Link>
      </p>
    </form>
  )
}
