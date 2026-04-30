const crypto = require('crypto');
const { z } = require('zod');
const prisma = require('../utils/prisma');
const HttpError = require('../utils/httpError');

const createSchema = z.object({
  title: z.string().min(2),
  eventDate: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
  description: z.string().optional(),
  coverImageUrl: z.string().url().optional()
});

async function createRegistry(userId, input) {
  const data = createSchema.parse(input);
  return prisma.registry.create({
    data: {
      coupleId: userId,
      title: data.title,
      eventDate: new Date(data.eventDate),
      description: data.description,
      coverImageUrl: data.coverImageUrl,
      shareToken: crypto.randomBytes(16).toString('hex')
    },
    include: { gifts: true }
  });
}

async function listOwn(userId, query) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 50);
  const where = { coupleId: userId };
  if (query.status) where.status = query.status;

  const [data, total] = await Promise.all([
    prisma.registry.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, include: { gifts: true } }),
    prisma.registry.count({ where })
  ]);

  return { data, total, page };
}

async function getByShareToken(token) {
  const registry = await prisma.registry.update({
    where: { shareToken: token },
    data: { viewCount: { increment: 1 } },
    include: { gifts: true }
  }).catch(() => null);
  if (!registry) throw new HttpError(404, 'Registry not found');
  return registry;
}

async function publish(userId, registryId) {
  const registry = await prisma.registry.findUnique({ where: { id: registryId }, include: { gifts: true } });
  if (!registry) throw new HttpError(404, 'Registry not found');
  if (registry.coupleId !== userId) throw new HttpError(403, 'Forbidden');
  if (registry.gifts.length === 0) throw new HttpError(400, 'Registry must have at least one gift before publishing');
  return prisma.registry.update({ where: { id: registryId }, data: { status: 'PUBLISHED' }, include: { gifts: true } });
}

module.exports = { createRegistry, listOwn, getByShareToken, publish };
