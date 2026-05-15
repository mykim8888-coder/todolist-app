const { AppError, ValidationError } = require('../utils/errors');

function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    const body = { code: err.code, message: err.message };
    if (err instanceof ValidationError && err.details !== undefined) {
      body.details = err.details;
    }
    res.status(err.statusCode).json({ success: false, error: body });
    return;
  }

  console.error('[error] 처리되지 않은 오류:', err instanceof Error ? err.stack : err);

  const isProduction = process.env.NODE_ENV === 'production';
  const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다';

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction ? '서버 오류가 발생했습니다' : message,
      ...(isProduction ? {} : { stack: err instanceof Error ? err.stack : undefined }),
    },
  });
}

module.exports = { errorHandler };
