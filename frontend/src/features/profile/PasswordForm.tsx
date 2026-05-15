import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { useUpdatePassword } from '@/hooks/useUpdatePassword'

const schema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요.'),
    newPassword: z
      .string()
      .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
      .regex(/[a-zA-Z]/, '영문자를 포함해야 합니다.')
      .regex(/[0-9]/, '숫자를 포함해야 합니다.'),
    newPasswordConfirm: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.newPasswordConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '새 비밀번호가 일치하지 않습니다.',
        path: ['newPasswordConfirm'],
      })
    }
  })

type FormValues = z.infer<typeof schema>

export function PasswordForm() {
  const { mutate, isPending } = useUpdatePassword()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
  })

  const onSubmit = ({ currentPassword, newPassword }: FormValues) => {
    mutate({ currentPassword, newPassword }, {
      onSuccess: () => reset(),
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 max-w-lg">
      <Input
        id="currentPassword"
        label="현재 비밀번호"
        type="password"
        placeholder="현재 비밀번호를 입력해주세요"
        error={errors.currentPassword?.message}
        {...register('currentPassword')}
      />
      <Input
        id="newPassword"
        label="새 비밀번호"
        type="password"
        placeholder="영문, 숫자 포함 8자 이상"
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />
      <Input
        id="newPasswordConfirm"
        label="새 비밀번호 확인"
        type="password"
        placeholder="새 비밀번호를 다시 입력해주세요"
        error={errors.newPasswordConfirm?.message}
        {...register('newPasswordConfirm')}
      />
      <Button type="submit" loading={isPending} className="self-start">
        비밀번호 변경
      </Button>
    </form>
  )
}
