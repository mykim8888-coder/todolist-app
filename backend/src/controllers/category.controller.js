const categoryService = require('../services/category.service');

async function getCategories(req, res, next) {
  try {
    const categories = await categoryService.getCategories(req.user.sub);
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const { name } = req.body;
    const category = await categoryService.createCategory(req.user.sub, name);
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    await categoryService.deleteCategory(req.user.sub, req.params.id);
    res.status(200).json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCategories, createCategory, deleteCategory };
