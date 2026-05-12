'use strict';

const express = require('express');
const controller = require('../controllers/notificationController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications
router.get('/', requireAuth, asyncHandler(controller.getNotifications));

// GET /api/notifications/etiquette — check kuttykau period
router.get('/etiquette', requireAuth, asyncHandler(controller.checkEtiquette));

// PATCH /api/notifications/read-all
router.patch('/read-all', requireAuth, asyncHandler(controller.markAllRead));

// PATCH /api/notifications/:id/read
router.patch('/:id/read', requireAuth, asyncHandler(controller.markRead));

// DELETE /api/notifications/:id
router.delete('/:id', requireAuth, asyncHandler(controller.deleteNotification));

module.exports = router;
