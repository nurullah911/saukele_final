'use strict';

const rateLimit = require('express-rate-limit');

// Rate limiting uses memory store by default
// When REDIS_URL is set, falls back to memory if Redis is unavailable
// This keeps the app working even without Redis

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `auth:${req.ip}:${req.body?.email || 'unknown'}`,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many attempts. Please try again in 15 minutes.' });
  },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests. Please slow down.' });
  },
});

const contributionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `contrib:${req.ip}:${req.user?.sub || 'anon'}`,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many contribution attempts.' });
  },
});

module.exports = { authLimiter, apiLimiter, contributionLimiter };
