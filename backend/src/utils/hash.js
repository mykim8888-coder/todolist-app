const bcrypt = require('bcryptjs');
const { config } = require('../config/env');

async function hashPassword(password) {
  return bcrypt.hash(password, config.BCRYPT_SALT_ROUNDS);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = { hashPassword, comparePassword };
