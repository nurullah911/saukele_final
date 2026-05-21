'use strict';

const prisma = require('../utils/prisma');
const HttpError = require('../utils/httpError');

async function addImage(userId, giftId, url, isPrimary = false) {
  const gift = await prisma.gift.findUnique({
    where: { id: giftId },
    include: { registry: true },
  });
  if (!gift) throw new HttpError(404, 'Gift not found');
  if (gift.registry.coupleId !== userId) throw new HttpError(403, 'Forbidden');

  if (isPrimary) {
    await prisma.giftImage.updateMany({
      where: { giftId },
      data: { isPrimary: false },
    });
  }

  const count = await prisma.giftImage.count({ where: { giftId } });

  return prisma.giftImage.create({
    data: { giftId, url, isPrimary, order: count },
  });
}

async function getImages(giftId) {
  return prisma.giftImage.findMany({
    where: { giftId },
    orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
  });
}

async function deleteImage(userId, imageId) {
  const image = await prisma.giftImage.findUnique({
    where: { id: imageId },
    include: { gift: { include: { registry: true } } },
  });
  if (!image) throw new HttpError(404, 'Image not found');
  if (image.gift.registry.coupleId !== userId) throw new HttpError(403, 'Forbidden');

  return prisma.giftImage.delete({ where: { id: imageId } });
}

module.exports = { addImage, getImages, deleteImage };
