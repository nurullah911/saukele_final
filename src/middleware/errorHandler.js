function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  if (process.env.NODE_ENV !== 'test') {
    console.error(err);
  }
  const message = status === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
