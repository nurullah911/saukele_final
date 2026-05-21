'use strict';

const express = require('express');
const controller = require('../controllers/giftController');
const imageController = require('../controllers/giftImageController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

const router = express.Router();

// Optional auth middleware — attaches req.user if token present, but doesn't block
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const { verifyAccessToken } = require('../utils/jwt');
      req.user = verifyAccessToken(header.slice(7));
    } catch {
      // Invalid token — treat as unauthenticated
    }
  }
  next();
}

// GET /api/gifts/:id — optional auth (needed for private gift visibility check)
router.get('/:id', optionalAuth, asyncHandler(controller.getGift));

router.post('/:id/images', requireAuth, requireRole('COUPLE'), asyncHandler(imageController.addImage));

router.get('/:id/images', requireAuth, asyncHandler(imageController.getImages));

router.delete(
  '/:id/images/:imageId',
  requireAuth,
  requireRole('COUPLE'),
  asyncHandler(imageController.deleteImage)
);

// POST /api/gifts — COUPLE only
router.post('/', requireAuth, requireRole('COUPLE'), asyncHandler(controller.addGift));

// PUT /api/gifts/:id — COUPLE only
router.put('/:id', requireAuth, requireRole('COUPLE'), asyncHandler(controller.updateGift));

// DELETE /api/gifts/:id — COUPLE only
router.delete('/:id', requireAuth, requireRole('COUPLE'), asyncHandler(controller.deleteGift));

// PATCH /api/gifts/:id/reserve — GUEST only
router.patch('/:id/reserve', requireAuth, requireRole('GUEST'), asyncHandler(controller.reserveGift));

module.exports = router;
