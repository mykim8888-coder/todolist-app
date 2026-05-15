const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const { UnauthorizedError } = require('./errors');

function signAccessToken(payload) {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, config.JWT_ACCESS_SECRET);
  } catch {
    throw new UnauthorizedError('유효하지 않은 액세스 토큰입니다');
  }
}

function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, config.JWT_REFRESH_SECRET);
  } catch {
    throw new UnauthorizedError('유효하지 않은 리프레시 토큰입니다');
  }
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
