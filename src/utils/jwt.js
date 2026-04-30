const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    env.jwtSecret,
    { algorithm: 'HS512', expiresIn: '15m' }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, tokenType: 'refresh' },
    env.refreshSecret,
    { algorithm: 'HS512', expiresIn: '7d' }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret, { algorithms: ['HS512'] });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.refreshSecret, { algorithms: ['HS512'] });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, hashToken };
