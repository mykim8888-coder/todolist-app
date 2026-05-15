const rateLimit = require('express-rate-limit');

const authRateLimiter = rateLimit({
  windowMs: 60_000,
  max: process.env['NODE_ENV'] === 'test' ? 10000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: '요청 횟수를 초과하였습니다. 잠시 후 다시 시도하세요.',
      },
    });
  },
});

module.exports = { authRateLimiter };
