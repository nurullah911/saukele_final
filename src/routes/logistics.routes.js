'use strict';

const express = require('express');
const controller = require('../controllers/logisticsController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

const router = express.Router();

// GET /api/logistics/providers — list courier providers (public)
router.get('/providers', asyncHandler(controller.getProviders));

// POST /api/logistics — dispatch courier (COUPLE only)
router.post('/', requireAuth, requireRole('COUPLE'), asyncHandler(controller.createOrder));

// GET /api/logistics/registry/:registryId — list orders (COUPLE only)
router.get('/registry/:registryId', requireAuth, requireRole('COUPLE'), asyncHandler(controller.getOrders));

// PATCH /api/logistics/:id/status — update status
router.patch('/:id/status', requireAuth, asyncHandler(controller.updateStatus));

module.exports = router;
