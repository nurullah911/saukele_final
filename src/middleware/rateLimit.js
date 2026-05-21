'use strict';

const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
    return `auth:${ip}:${req.body?.email || 'unknown'}`;
  },
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many attempts. Please try again in 15 minutes.' });
  },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for'] || req.ip || 'unknown';
  },
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests. Please slow down.' });
  },
});

const contributionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
    return `contrib:${ip}:${req.user?.sub || 'anon'}`;
  },
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many contribution attempts.' });
  },
});

module.exports = { authLimiter, apiLimiter, contributionLimiter };
