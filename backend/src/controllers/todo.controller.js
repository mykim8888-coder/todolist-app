const todoService = require('../services/todo.service');

async function getTodos(req, res, next) {
  try {
    const { categoryId, isCompleted, overdue } = req.query;

    const filter = {};
    if (categoryId !== undefined) filter.categoryId = categoryId;
    if (isCompleted !== undefined) filter.isCompleted = isCompleted === 'true';
    if (overdue !== undefined) filter.overdue = overdue === 'true';

    const todos = await todoService.getTodos(req.user.sub, filter);
    res.status(200).json({ success: true, data: todos });
  } catch (err) {
    next(err);
  }
}

async function getTodo(req, res, next) {
  try {
    const todo = await todoService.getTodo(req.user.sub, req.params.id);
    res.status(200).json({ success: true, data: todo });
  } catch (err) {
    next(err);
  }
}

async function createTodo(req, res, next) {
  try {
    const todo = await todoService.createTodo(req.user.sub, req.body);
    res.status(201).json({ success: true, data: todo });
  } catch (err) {
    next(err);
  }
}

async function updateTodo(req, res, next) {
  try {
    const todo = await todoService.updateTodo(req.user.sub, req.params.id, req.body);
    res.status(200).json({ success: true, data: todo });
  } catch (err) {
    next(err);
  }
}

async function deleteTodo(req, res, next) {
  try {
    await todoService.deleteTodo(req.user.sub, req.params.id);
    res.status(200).json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

module.exports = { getTodos, getTodo, createTodo, updateTodo, deleteTodo };
