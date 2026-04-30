const { verifyAccessToken } = require('../utils/jwt');
const HttpError = require('../utils/httpError');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Missing or invalid Authorization header'));
  }

  try {
    const token = header.slice('Bearer '.length);
    req.user = verifyAccessToken(token);
    return next();
  } catch (error) {
    return next(new HttpError(401, 'Invalid or expired access token'));
  }
}

module.exports = { requireAuth };
