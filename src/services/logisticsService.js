'use strict';

const { z } = require('zod');
const prisma = require('../utils/prisma');
const HttpError = require('../utils/httpError');

// COMPLEXITY: Logistics Orchestration
// Integration with Choco and inDriver couriers for fragile traditional items
// Business rules:
//   - Fragile items MUST use white glove handling
//   - White glove is only supported by CHOCO (not inDriver)
//   - Status flow: PENDING → ASSIGNED → IN_TRANSIT → DELIVERED

const PROVIDERS = {
  CHOCO: { name: 'Choco', supportsWhiteGlove: true, estimateMinutes: 45 },
  INDRIVER: { name: 'inDriver', supportsWhiteGlove: false, estimateMinutes: 30 },
};

const VALID_STATUSES = ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];

const createOrderSchema = z.object({
  giftId: z.number().int().positive(),
  registryId: z.number().int().positive(),
  courierProvider: z.enum(['CHOCO', 'INDRIVER']),
  isFragile: z.boolean().default(false),
  whiteGlove: z.boolean().default(false),
  pickupAddress: z.string().min(5),
  deliveryAddress: z.string().min(5),
});

async function createOrder(userId, input) {
  const data = createOrderSchema.parse(input);

  // Validate registry ownership
  const registry = await prisma.registry.findUnique({ where: { id: data.registryId } });
  if (!registry) throw new HttpError(404, 'Registry not found');
  if (registry.coupleId !== userId) throw new HttpError(403, 'Forbidden');

  // Business rule: fragile items require white glove
  if (data.isFragile && !data.whiteGlove) {
    throw new HttpError(400, 'Fragile items require white glove handling (set whiteGlove: true)');
  }

  // Business rule: white glove only available through CHOCO
  if (data.whiteGlove && data.courierProvider === 'INDRIVER') {
    throw new HttpError(400, 'inDriver does not support white glove handling. Use CHOCO for fragile items.');
  }

  const provider = PROVIDERS[data.courierProvider];
  // Simulate provider order ID (in production this comes from Choco/inDriver API response)
  const providerOrderId = `${data.courierProvider}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const estimatedAt = new Date(Date.now() + provider.estimateMinutes * 60 * 1000);

  return prisma.logisticsOrder.create({
    data: {
      giftId: data.giftId,
      registryId: data.registryId,
      courierProvider: data.courierProvider,
      isFragile: data.isFragile,
      whiteGlove: data.whiteGlove,
      pickupAddress: data.pickupAddress,
      deliveryAddress: data.deliveryAddress,
      providerOrderId,
      estimatedAt,
      status: 'PENDING',
    },
  });
}

async function getOrders(registryId) {
  return prisma.logisticsOrder.findMany({
    where: { registryId },
    orderBy: { createdAt: 'desc' },
    include: {
      gift: {
        select: {
          title: true,
          priceKzt: true,
          giftType: true,
          status: true,
        },
      },
    },
  });
}

async function updateStatus(orderId, status) {
  if (!VALID_STATUSES.includes(status)) {
    throw new HttpError(400, `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  const order = await prisma.logisticsOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new HttpError(404, 'Logistics order not found');

  const data = { status };
  if (status === 'DELIVERED') data.deliveredAt = new Date();

  return prisma.logisticsOrder.update({ where: { id: orderId }, data });
}

function getProviders() {
  return Object.entries(PROVIDERS).map(([id, p]) => ({ id, ...p }));
}

module.exports = { createOrder, getOrders, updateStatus, getProviders };
