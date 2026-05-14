'use strict';

const { ZodError } = require('zod');

function errorHandler(err, req, res, _next) {
  // Zod validation error → 400
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Prisma unique constraint violation → 409
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with this value already exists' });
  }

  // Prisma not found → 404
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  // Prisma foreign key violation → 409
  if (err.code === 'P2003') {
    return res.status(409).json({ error: 'Related record not found' });
  }

  // Custom HttpError
  const status = err.statusCode || err.status || 500;
  const message = status === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';

  if (status === 500) {
    console.error('[ERROR]', err.message, err.stack);
  }

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
