import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { useProfile } from '@/hooks/useProfile'
import { useUpdateProfile } from '@/hooks/useUpdateProfile'

const schema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.'),
})

type FormValues = z.infer<typeof schema>

export function ProfileForm() {
  const { data: profile } = useProfile()
  const { mutate, isPending } = useUpdateProfile()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { name: '' },
  })

  useEffect(() => {
    if (profile) {
      reset({ name: profile.name })
    }
  }, [profile, reset])

  return (
    <form
      onSubmit={handleSubmit((values) => mutate({ name: values.name }))}
      className="flex flex-col gap-4 max-w-lg"
    >
      <Input
        id="profile-name"
        label="이름"
        placeholder="이름을 입력해주세요"
        error={errors.name?.message}
        {...register('name')}
      />
      <Button type="submit" loading={isPending} className="self-start">
        이름 저장
      </Button>
    </form>
  )
}
