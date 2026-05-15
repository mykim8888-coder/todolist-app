import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Modal } from '@/components/Modal'
import { useDeleteAccount } from '@/hooks/useDeleteAccount'

const passwordSchema = z.object({
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
})

type PasswordFormValues = z.infer<typeof passwordSchema>

type Step = 'idle' | 'password' | 'confirm'

export function DeleteAccountSection() {
  const [step, setStep] = useState<Step>('idle')
  const [confirmedPassword, setConfirmedPassword] = useState('')
  const { mutate, isPending } = useDeleteAccount()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  })

  const handlePasswordSubmit = ({ password }: PasswordFormValues) => {
    setConfirmedPassword(password)
    setStep('confirm')
  }

  const handleClose = () => {
    setStep('idle')
    reset()
    setConfirmedPassword('')
  }

  const handleConfirmDelete = () => {
    mutate(
      { password: confirmedPassword },
      { onError: handleClose },
    )
  }

  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        계정을 탈퇴하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
      </p>
      <Button variant="danger" onClick={() => setStep('password')}>
        회원 탈퇴
      </Button>

      <Modal isOpen={step === 'password'} onClose={handleClose} title="회원 탈퇴 확인 (1/2)">
        <form onSubmit={handleSubmit(handlePasswordSubmit)} className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            본인 확인을 위해 현재 비밀번호를 입력해 주세요.
          </p>
          <Input
            id="delete-password"
            label="현재 비밀번호"
            type="password"
            placeholder="비밀번호를 입력해주세요"
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={handleClose}>
              취소
            </Button>
            <Button type="submit" variant="danger">
              다음 단계 →
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={step === 'confirm'} onClose={handleClose} title="최종 확인 (2/2)">
        <div className="flex flex-col gap-4">
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <div className="flex items-start gap-2 mb-2">
              <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm font-semibold text-red-700">정말로 탈퇴하시겠습니까?</p>
            </div>
            <p className="text-sm text-red-600 mb-2">아래 항목이 모두 영구 삭제됩니다:</p>
            <ul className="text-sm text-red-600 space-y-1 list-disc list-inside">
              <li>내 계정 및 프로필 정보</li>
              <li>작성한 모든 할일 데이터</li>
              <li>생성한 모든 카테고리</li>
            </ul>
            <p className="text-sm font-bold text-red-700 mt-3">이 작업은 절대 되돌릴 수 없습니다.</p>
          </div>
          <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={handleClose}>
              ← 취소, 유지하기
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={isPending}
              onClick={handleConfirmDelete}
            >
              탈퇴하기
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
