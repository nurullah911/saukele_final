'use strict';

const express = require('express');
const controller = require('../controllers/inviteController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

const router = express.Router();

router.post(
  '/registries/:registryId/invites',
  requireAuth,
  requireRole('COUPLE'),
  asyncHandler(controller.invite)
);
router.get(
  '/registries/:registryId/invites',
  requireAuth,
  requireRole('COUPLE'),
  asyncHandler(controller.getInvites)
);
router.patch('/registries/:registryId/invites/respond', requireAuth, asyncHandler(controller.respond));
router.get('/invites/my', requireAuth, asyncHandler(controller.getMyInvites));

module.exports = router;
