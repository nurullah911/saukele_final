const express = require('express');
const controller = require('../controllers/contributionController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const { contributionLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/', requireAuth, requireRole('GUEST'), contributionLimiter, asyncHandler(controller.createContribution));
router.post('/webhook/payment', asyncHandler(controller.paymentWebhook));

module.exports = router;
