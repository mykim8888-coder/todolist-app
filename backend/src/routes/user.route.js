const { Router } = require('express');
const { z } = require('zod');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');

const router = Router();

const updateMeSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: z
      .string()
      .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
      .regex(/^(?=.*[A-Za-z])(?=.*\d)/, '비밀번호는 영문과 숫자를 포함해야 합니다')
      .optional(),
  })
  .refine((d) => d.name !== undefined || d.newPassword !== undefined, {
    message: '수정할 항목(name 또는 newPassword)을 입력해주세요',
  });

const deleteMeSchema = z.object({
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

router.use(authenticate);

router.get('/me', userController.getMe);
router.patch('/me', validate(updateMeSchema), userController.updateMe);
router.delete('/me', validate(deleteMeSchema), userController.deleteMe);

module.exports = router;
