'use strict';

const express = require('express');
const controller = require('../controllers/kinshipController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

const router = express.Router();

// POST /api/kinship - set kinship
router.post('/', requireAuth, requireRole('GUEST'), asyncHandler(controller.setKinship));

// GET /api/kinship/:coupleId - get own kinship + suggested amount
router.get('/:coupleId', requireAuth, requireRole('GUEST'), asyncHandler(controller.getKinship));

// PUT /api/kinship/:coupleId - update kinship type
router.put('/:coupleId', requireAuth, requireRole('GUEST'), asyncHandler(controller.updateKinship));

// DELETE /api/kinship/:coupleId - remove kinship
router.delete('/:coupleId', requireAuth, requireRole('GUEST'), asyncHandler(controller.deleteKinship));

// GET /api/kinship/:coupleId/tree - recursive family tree (self-referential CTE)
router.get('/:coupleId/tree', requireAuth, asyncHandler(controller.getFamilyTree));

module.exports = router;
