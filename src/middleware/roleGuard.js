const HttpError = require('../utils/httpError');

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new HttpError(401, 'Authentication required'));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, 'Forbidden'));
    return next();
  };
}

module.exports = { requireRole };
