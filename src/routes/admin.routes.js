'use strict';

const express = require('express');
const controller = require('../controllers/adminController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

const router = express.Router();
const admin = [requireAuth, requireRole('ADMIN')];

// ── Users ──────────────────────────────────────────────────────
router.get('/users',                   ...admin, asyncHandler(controller.listUsers));
router.get('/users/:id',               ...admin, asyncHandler(controller.getUser));
router.patch('/users/:id/suspend',     ...admin, asyncHandler(controller.suspendUser));
router.delete('/users/:id',            ...admin, asyncHandler(controller.deleteUser));

// ── Registries ─────────────────────────────────────────────────
router.get('/registries',              ...admin, asyncHandler(controller.listRegistries));
router.patch('/registries/:id/close',  ...admin, asyncHandler(controller.closeRegistry));
router.delete('/registries/:id',       ...admin, asyncHandler(controller.deleteRegistry));

// ── Contributions ──────────────────────────────────────────────
router.get('/contributions',           ...admin, asyncHandler(controller.listContributions));
router.patch('/contributions/:id/flag',...admin, asyncHandler(controller.flagContribution));

module.exports = router;
