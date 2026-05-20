'use strict';

const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const prisma = require('../utils/prisma');
const HttpError = require('../utils/httpError');

const router = express.Router();

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isVerified: true,
      createdAt: true,
      profile: true
    }
  });
  if (!user) throw new HttpError(404, 'User not found');
  res.json(user);
}));

router.put('/me', requireAuth, asyncHandler(async (req, res) => {
  const { name, bio, phoneNumber, city, instagramHandle } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user.sub },
    data: {
      ...(name && { name }),
      profile: {
        update: {
          ...(bio !== undefined && { bio }),
          ...(phoneNumber !== undefined && { phoneNumber }),
          ...(city !== undefined && { city }),
          ...(instagramHandle !== undefined && { instagramHandle })
        }
      }
    },
    select: { id: true, email: true, name: true, role: true, profile: true }
  });
  res.json(user);
}));

module.exports = router;
