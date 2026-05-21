'use strict';

const { z } = require('zod');
const prisma = require('../utils/prisma');
const HttpError = require('../utils/httpError');
const { emailQueue } = require('../workers/emailWorker');

const createGiftSchema = z.object({
  registryId: z.number().int().positive(),
  title: z.string().min(2),
  description: z.string().optional(),
  priceKzt: z.number().positive(),
  category: z.string().optional(),
  giftType: z.enum(['SINGLE', 'POOL']),
  isPrivate: z.boolean().optional().default(false),
});

async function addGift(userId, input) {
  const data = createGiftSchema.parse(input);
  const registry = await prisma.registry.findUnique({ where: { id: data.registryId } });
  if (!registry) throw new HttpError(404, 'Registry not found');
  if (registry.coupleId !== userId) throw new HttpError(403, 'Forbidden');

  return prisma.gift.create({
    data: {
      registryId: data.registryId,
      title: data.title,
      description: data.description,
      priceKzt: data.priceKzt,
      category: data.category,
      giftType: data.giftType,
      isPrivate: data.isPrivate || false,
    }
  });
}

// COMPLEXITY: Privacy Tiers
// isPrivate gifts are visible only to guests with tier 1-2 (ATA_ANA, TUYS)
async function canViewPrivateGift(viewerUserId, coupleId) {
  if (!viewerUserId) return false;
  const relation = await prisma.familyRelation.findUnique({
    where: { fromUserId_toUserId: { fromUserId: viewerUserId, toUserId: coupleId } }
  });
  if (!relation) return false;
  return relation.tier <= 2;
}

async function getGift(id, viewerUserId) {
  const gift = await prisma.gift.findUnique({
    where: { id },
    include: {
      images: true,
      registry: { select: { coupleId: true } },
      contributions: { where: { status: 'FUNDED' }, select: { amountKzt: true } },
    },
  });
  if (!gift) throw new HttpError(404, 'Gift not found');

  if (gift.isPrivate) {
    const coupleId = gift.registry.coupleId;
    const isOwner = viewerUserId === coupleId;
    const canView = isOwner || await canViewPrivateGift(viewerUserId, coupleId);
    if (!canView) throw new HttpError(403, 'This gift is private and only visible to close family');
  }

  const totalFunded = gift.contributions.reduce((sum, c) => sum + parseFloat(c.amountKzt), 0);
  return { ...gift, totalFunded, remaining: parseFloat(gift.priceKzt) - totalFunded };
}

async function reserveGift(userId, giftId) {
  return prisma.$transaction(async (tx) => {
    const gift = await tx.gift.findUnique({
      where: { id: giftId },
      include: { registry: { select: { coupleId: true } } }
    });
    if (!gift) throw new HttpError(404, 'Gift not found');
    if (gift.giftType !== 'SINGLE') throw new HttpError(400, 'Only SINGLE gifts can be reserved');
    if (gift.status === 'PURCHASED' || gift.status === 'DELIVERED') throw new HttpError(422, 'Gift is already purchased');
    const activeReservation = gift.status === 'RESERVED' && gift.reservedUntil && gift.reservedUntil > new Date();
    if (activeReservation) throw new HttpError(409, 'Gift is already reserved');

    const reservedUntil = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const updated = await tx.gift.update({
      where: { id: giftId },
      data: { status: 'RESERVED', reservedByUserId: userId, reservedUntil },
    });

    await tx.notification.create({
      data: {
        userId: gift.registry.coupleId,
        type: 'GIFT_RESERVED',
        message: `Подарок "${gift.title}" был забронирован гостем`,
        targetType: 'gift',
        targetId: giftId
      }
    });

    // EMAIL NOTIFICATION: notify couple that gift was reserved (business event #3)
    const registry = await tx.registry.findUnique({
      where: { id: gift.registryId },
      include: { couple: { select: { email: true, name: true } } }
    });
    const guest = await tx.user.findUnique({ where: { id: userId }, select: { name: true } });
    if (registry?.couple?.email) {
      await emailQueue.add('gift-reserved-notification', {
        type: 'giftReserved',
        data: {
          to: registry.couple.email,
          giftName: gift.title,
          reservedBy: guest?.name || 'A guest',
        }
      });
    }

    return updated;
  });
}

async function updateGift(userId, giftId, input) {
  const gift = await prisma.gift.findUnique({ where: { id: giftId }, include: { registry: true } });
  if (!gift || gift.registry.coupleId !== userId) throw new HttpError(403, 'Forbidden');
  return prisma.gift.update({
    where: { id: giftId },
    data: {
      ...(input.title && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.priceKzt && { priceKzt: input.priceKzt }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.isPrivate !== undefined && { isPrivate: input.isPrivate }),
    },
  });
}

async function deleteGift(userId, giftId) {
  const gift = await prisma.gift.findUnique({ where: { id: giftId }, include: { registry: true } });
  if (!gift || gift.registry.coupleId !== userId) throw new HttpError(403, 'Forbidden');
  const active = await prisma.contribution.count({
    where: { giftId, status: { in: ['PENDING', 'FUNDED'] } },
  });
  if (active > 0) throw new HttpError(409, 'Cannot delete gift with active contributions');
  await prisma.gift.delete({ where: { id: giftId } });
}

module.exports = { addGift, getGift, reserveGift, updateGift, deleteGift, canViewPrivateGift };
