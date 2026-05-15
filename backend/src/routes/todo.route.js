const { Router } = require('express');
const { z } = require('zod');
const todoController = require('../controllers/todo.controller');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');

const router = Router();

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const createTodoSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(255),
  categoryId: z.string().uuid('올바른 카테고리 ID를 입력해주세요'),
  description: z.string().optional(),
  start_date: z.string().regex(dateRegex, 'YYYY-MM-DD 형식으로 입력해주세요').optional(),
  due_date: z.string().regex(dateRegex, 'YYYY-MM-DD 형식으로 입력해주세요').optional(),
});

const updateTodoSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  categoryId: z.string().uuid().optional(),
  description: z.string().nullable().optional(),
  start_date: z.string().regex(dateRegex).nullable().optional(),
  due_date: z.string().regex(dateRegex).nullable().optional(),
  is_completed: z.boolean().optional(),
});

router.use(authenticate);

router.get('/', todoController.getTodos);
router.post('/', validate(createTodoSchema), todoController.createTodo);
router.get('/:id', todoController.getTodo);
router.patch('/:id', validate(updateTodoSchema), todoController.updateTodo);
router.delete('/:id', todoController.deleteTodo);

module.exports = router;
