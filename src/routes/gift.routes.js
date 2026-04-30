const express = require('express');
const controller = require('../controllers/giftController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

const router = express.Router();

router.get('/:id', asyncHandler(controller.getGift));
router.post('/', requireAuth, requireRole('COUPLE'), asyncHandler(controller.addGift));
router.patch('/:id/reserve', requireAuth, requireRole('GUEST'), asyncHandler(controller.reserveGift));

module.exports = router;
