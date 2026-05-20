const express = require('express');
const controller = require('../controllers/registryController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

const router = express.Router();

router.get('/share/:token', asyncHandler(controller.getByShareToken));
router.post('/', requireAuth, requireRole('COUPLE'), asyncHandler(controller.create));
router.get('/', requireAuth, requireRole('COUPLE'), asyncHandler(controller.listOwn));
router.patch('/:id/publish', requireAuth, requireRole('COUPLE'), asyncHandler(controller.publish));
router.get('/:id', requireAuth, asyncHandler(controller.getById));

module.exports = router;
