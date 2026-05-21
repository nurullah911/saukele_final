const { z } = require('zod');
const crypto = require('crypto');
const prisma = require('../utils/prisma');
const HttpError = require('../utils/httpError');
const { getExchangeRateToKzt } = require('./currencyService');

const contributeSchema = z.object({
  giftId: z.number().int().positive(),
  amountKzt: z.number().positive(),
  originalCurrency: z.string().default('KZT'),
  amountOriginal: z.number().positive().optional(),
  message: z.string().max(500).optional()
});

async function createContribution(userId, input) {
  const data = contributeSchema.parse(input);
  const currency = data.originalCurrency.toUpperCase();
  const exchangeRateAtTime = getExchangeRateToKzt(currency);
  const amountOriginal = data.amountOriginal || data.amountKzt / exchangeRateAtTime;

  return prisma.$transaction(async (tx) => {
    const gift = await tx.gift.findUnique({ where: { id: data.giftId }, include: { contributions: true } });
    if (!gift) throw new HttpError(404, 'Gift not found');
    if (gift.giftType !== 'POOL') throw new HttpError(400, 'Gift is not a POOL gift');
    if (gift.status === 'PURCHASED' || gift.status === 'DELIVERED') throw new HttpError(409, 'Gift already fully funded');

    const fundedTotal = gift.contributions
      .filter((item) => item.status === 'FUNDED' || item.status === 'PENDING')
      .reduce((sum, item) => sum + Number(item.amountKzt), 0);

    if (fundedTotal + data.amountKzt > Number(gift.priceKzt)) {
      throw new HttpError(409, 'Contribution would overfund the gift');
    }

    const contribution = await tx.contribution.create({
      data: {
        giftId: data.giftId,
        guestId: userId,
        amountKzt: data.amountKzt,
        amountOriginal,
        originalCurrency: currency,
        exchangeRateAtTime,
        lockedAt: new Date(),
        status: 'PENDING',
        paymentRef: crypto.randomUUID(),
        message: data.message
      }
    });

    await tx.paymentLog.create({
      data: { contributionId: contribution.id, event: 'INITIATED', providerRef: contribution.paymentRef }
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: 'CONTRIBUTION_CREATED',
        targetType: 'Contribution',
        targetId: contribution.id,
        metadata: { giftId: data.giftId, amountKzt: data.amountKzt }
      }
    });

    return contribution;
  });
}

async function processWebhook(paymentRef, status) {
  if (!['SUCCESS', 'FAILED'].includes(status)) throw new HttpError(400, 'Invalid webhook status');

  return prisma.$transaction(async (tx) => {
    const contribution = await tx.contribution.findFirst({ where: { paymentRef }, include: { gift: true } });
    if (!contribution) throw new HttpError(404, 'Contribution not found');

    const newStatus = status === 'SUCCESS' ? 'FUNDED' : 'REFUNDED';
    const updated = await tx.contribution.update({
      where: { id: contribution.id },
      data: { status: newStatus }
    });

    await tx.paymentLog.create({
      data: { contributionId: contribution.id, event: status, providerRef: paymentRef }
    });

    if (status === 'SUCCESS') {
      const funded = await tx.contribution.findMany({ where: { giftId: contribution.giftId, status: 'FUNDED' } });
      const total = funded.reduce((sum, item) => sum + Number(item.amountKzt), 0);
      const gift = await tx.gift.findUnique({
        where: { id: contribution.giftId },
        include: { registry: { select: { coupleId: true, title: true } } }
      });

      await tx.notification.create({
        data: {
          userId: gift.registry.coupleId,
          type: 'CONTRIBUTION_FUNDED',
          message: `Получен вклад ${contribution.amountKzt} ₸ на подарок "${gift.title}"`,
          targetType: 'contribution',
          targetId: contribution.id
        }
      });

      if (total >= Number(contribution.gift.priceKzt)) {
        await tx.gift.update({ where: { id: contribution.giftId }, data: { status: 'PURCHASED', purchasedAt: new Date() } });
        await tx.notification.create({
          data: {
            userId: gift.registry.coupleId,
            type: 'GIFT_FULLY_FUNDED',
            message: `🎉 Подарок "${gift.title}" полностью собран! Можно заказывать доставку.`,
            targetType: 'gift',
            targetId: contribution.giftId
          }
        });
      }
    }

    return updated;
  });
}

module.exports = { createContribution, processWebhook };
