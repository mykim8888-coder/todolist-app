const userService = require('../services/user.service');

async function getMe(req, res, next) {
  try {
    const user = await userService.getMe(req.user.sub);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const user = await userService.updateMe(req.user.sub, req.body);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function deleteMe(req, res, next) {
  try {
    await userService.deleteMe(req.user.sub, req.body.password);
    res.status(200).json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe, updateMe, deleteMe };
