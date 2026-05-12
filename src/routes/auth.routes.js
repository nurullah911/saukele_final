const express = require('express');
const controller = require('../controllers/authController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register', authLimiter, asyncHandler(controller.register));
router.get('/verify-email', asyncHandler(controller.verifyEmail));
router.post('/login', authLimiter, asyncHandler(controller.login));
router.post('/refresh', authLimiter, asyncHandler(controller.refresh));
router.post('/logout', authLimiter, requireAuth, asyncHandler(controller.logout));
router.post('/forgot-password', authLimiter, asyncHandler(controller.forgotPassword));
router.post('/reset-password', authLimiter, asyncHandler(controller.resetPassword));

module.exports = router;