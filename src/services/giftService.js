const { z } = require('zod');
const prisma = require('../utils/prisma');
const HttpError = require('../utils/httpError');

const createGiftSchema = z.object({
  registryId: z.number().int().positive(),
  title: z.string().min(2),
  description: z.string().optional(),
  priceKzt: z.number().positive(),
  category: z.string().optional(),
  giftType: z.enum(['SINGLE', 'POOL'])
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
      giftType: data.giftType
    }
  });
}

async function reserveGift(userId, giftId) {
  return prisma.$transaction(async (tx) => {
    const gift = await tx.gift.findUnique({ where: { id: giftId } });
    if (!gift) throw new HttpError(404, 'Gift not found');
    if (gift.giftType !== 'SINGLE') throw new HttpError(400, 'Only SINGLE gifts can be reserved');
    if (gift.status === 'PURCHASED' || gift.status === 'DELIVERED') throw new HttpError(422, 'Gift is already purchased');

    const now = new Date();
    const activeReservation = gift.status === 'RESERVED' && gift.reservedUntil && gift.reservedUntil > now;
    if (activeReservation) throw new HttpError(409, 'Gift already reserved');

    const reservedUntil = new Date(Date.now() + 48 * 60 * 60 * 1000);
    return tx.gift.update({
      where: { id: giftId },
      data: { status: 'RESERVED', reservedByUserId: userId, reservedUntil }
    });
  });
}

async function getGift(giftId) {
  const gift = await prisma.gift.findUnique({
    where: { id: giftId },
    include: { contributions: { where: { status: 'FUNDED' } }, images: true }
  });
  if (!gift) throw new HttpError(404, 'Gift not found');
  const totalFunded = gift.contributions.reduce((sum, c) => sum + Number(c.amountKzt), 0);
  return { ...gift, totalFunded };
}

module.exports = { addGift, reserveGift, getGift };
