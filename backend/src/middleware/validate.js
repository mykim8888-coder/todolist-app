const { ValidationError } = require('../utils/errors');

function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      next(new ValidationError('입력값이 올바르지 않습니다', details));
      return;
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate };
