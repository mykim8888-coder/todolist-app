import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { useUiStore } from '@/stores/ui.store'
import { signup } from '@/api/auth.api'

const schema = z
  .object({
    name: z.string().min(1, '이름을 입력해주세요.'),
    email: z.string().email('올바른 이메일 형식을 입력해주세요.'),
    password: z
      .string()
      .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
      .regex(/[a-zA-Z]/, '영문자를 포함해야 합니다.')
      .regex(/[0-9]/, '숫자를 포함해야 합니다.'),
    passwordConfirm: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.passwordConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '비밀번호가 일치하지 않습니다.',
        path: ['passwordConfirm'],
      })
    }
  })

type FormValues = z.infer<typeof schema>

export function SignupForm() {
  const navigate = useNavigate()
  const showToast = useUiStore((s) => s.showToast)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
  })

  const { mutate, isPending } = useMutation({
    mutationFn: ({ name, email, password }: Omit<FormValues, 'passwordConfirm'>) =>
      signup({ name, email, password }),
    onSuccess: () => {
      showToast('회원가입이 완료되었습니다. 로그인해주세요.', 'success')
      navigate('/login')
    },
    onError: (error: unknown) => {
      let message = '회원가입에 실패했습니다.'
      if (isAxiosError(error) && error.response?.status === 409) {
        message = '이미 사용 중인 이메일입니다.'
      } else if (isAxiosError(error)) {
        message = error.response?.data?.error?.message ?? message
      }
      showToast(message, 'error')
    },
  })

  const onSubmit = ({ passwordConfirm: _, ...body }: FormValues) => {
    mutate(body)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        id="name"
        label="이름"
        placeholder="이름을 입력해주세요"
        error={errors.name?.message}
        {...register('name')}
      />
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
        placeholder="영문, 숫자 포함 8자 이상"
        error={errors.password?.message}
        {...register('password')}
      />
      <Input
        id="passwordConfirm"
        label="비밀번호 확인"
        type="password"
        placeholder="비밀번호를 다시 입력해주세요"
        error={errors.passwordConfirm?.message}
        {...register('passwordConfirm')}
      />
      <Button type="submit" loading={isPending} className="w-full mt-2">
        회원가입
      </Button>
      <p className="text-center text-sm text-gray-600">
        이미 계정이 있으신가요?{' '}
        <Link to="/login" className="text-violet-600 font-medium hover:text-violet-700">
          로그인
        </Link>
      </p>
    </form>
  )
}
