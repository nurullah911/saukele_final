const express = require('express');
const controller = require('../controllers/adminController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

const router = express.Router();

router.get('/users', requireAuth, requireRole('ADMIN'), asyncHandler(controller.listUsers));

module.exports = router;
