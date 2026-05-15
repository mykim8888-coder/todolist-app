const { Router } = require('express');
const { z } = require('zod');
const categoryController = require('../controllers/category.controller');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');

const router = Router();

const createCategorySchema = z.object({
  name: z.string().min(1, '카테고리 이름을 입력해주세요').max(100, '카테고리 이름은 100자 이하여야 합니다'),
});

router.use(authenticate);

router.get('/', categoryController.getCategories);
router.post('/', validate(createCategorySchema), categoryController.createCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
