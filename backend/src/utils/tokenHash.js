const { createHash } = require('crypto');

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

module.exports = { hashToken };
