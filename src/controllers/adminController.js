'use strict';

const prisma = require('../utils/prisma');
const HttpError = require('../utils/httpError');
const { publicUser } = require('../services/authService');

// ── USERS ──────────────────────────────────────────────────────

async function listUsers(req, res) {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
  const [users, total] = await Promise.all([
    prisma.user.findMany({ skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.user.count()
  ]);
  res.status(200).json({ data: users.map(publicUser), total, page });
}

async function getUser(req, res) {
  const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
  if (!user) throw new HttpError(404, 'User not found');
  res.status(200).json(publicUser(user));
}

async function suspendUser(req, res) {
  const id = Number(req.params.id);
  if (id === req.user.sub) throw new HttpError(400, 'Cannot suspend yourself');
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new HttpError(404, 'User not found');
  const updated = await prisma.user.update({
    where: { id },
    data: { isSuspended: req.body.isSuspended ?? true },
  });
  res.status(200).json(publicUser(updated));
}

async function deleteUser(req, res) {
  const id = Number(req.params.id);
  if (id === req.user.sub) throw new HttpError(400, 'Cannot delete yourself');
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new HttpError(404, 'User not found');
  await prisma.user.delete({ where: { id } });
  res.status(204).send();
}

// ── REGISTRIES ─────────────────────────────────────────────────

async function listRegistries(req, res) {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
  const [data, total] = await Promise.all([
    prisma.registry.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { couple: { select: { id: true, name: true, email: true } }, _count: { select: { gifts: true } } }
    }),
    prisma.registry.count()
  ]);
  res.status(200).json({ data, total, page });
}

async function closeRegistry(req, res) {
  const id = Number(req.params.id);
  const registry = await prisma.registry.findUnique({ where: { id } });
  if (!registry) throw new HttpError(404, 'Registry not found');
  const updated = await prisma.registry.update({ where: { id }, data: { status: 'CLOSED' } });
  res.status(200).json(updated);
}

async function deleteRegistry(req, res) {
  const id = Number(req.params.id);
  const registry = await prisma.registry.findUnique({ where: { id } });
  if (!registry) throw new HttpError(404, 'Registry not found');
  const activeContributions = await prisma.contribution.count({
    where: { gift: { registryId: id }, status: { in: ['PENDING', 'FUNDED'] } }
  });
  if (activeContributions > 0) throw new HttpError(409, 'Cannot delete registry with active contributions');
  await prisma.registry.delete({ where: { id } });
  res.status(204).send();
}

// ── CONTRIBUTIONS ──────────────────────────────────────────────

async function listContributions(req, res) {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
  const [data, total] = await Promise.all([
    prisma.contribution.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        guest: { select: { id: true, name: true, email: true } },
        gift: { select: { id: true, title: true } }
      }
    }),
    prisma.contribution.count()
  ]);
  res.status(200).json({ data, total, page });
}

async function flagContribution(req, res) {
  const id = Number(req.params.id);
  const { reason } = req.body;
  if (!reason) throw new HttpError(400, 'Reason is required');
  const contribution = await prisma.contribution.findUnique({ where: { id } });
  if (!contribution) throw new HttpError(404, 'Contribution not found');
  // Log the flag in audit log — admin cannot change amounts, only flag
  await prisma.auditLog.create({
    data: {
      userId: req.user.sub,
      action: 'CONTRIBUTION_FLAGGED',
      targetType: 'Contribution',
      targetId: id,
      metadata: { reason },
      ipAddress: req.ip,
    }
  });
  res.status(200).json({ message: 'Contribution flagged for review', contributionId: id, reason });
}

module.exports = {
  listUsers, getUser, suspendUser, deleteUser,
  listRegistries, closeRegistry, deleteRegistry,
  listContributions, flagContribution,
};
