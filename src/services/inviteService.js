'use strict';

const prisma = require('../utils/prisma');
const HttpError = require('../utils/httpError');

async function inviteGuest(coupleId, registryId, guestEmail) {
  const registry = await prisma.registry.findUnique({ where: { id: registryId } });
  if (!registry) throw new HttpError(404, 'Registry not found');
  if (registry.coupleId !== coupleId) throw new HttpError(403, 'Forbidden');

  const guest = await prisma.user.findUnique({ where: { email: guestEmail } });
  if (!guest) throw new HttpError(404, 'Guest not found with this email');

  const existing = await prisma.guestInvite.findUnique({
    where: { registryId_guestId: { registryId, guestId: guest.id } },
  });
  if (existing) throw new HttpError(409, 'Guest already invited');

  return prisma.guestInvite.create({
    data: { registryId, guestId: guest.id, invitedByUserId: coupleId, status: 'PENDING' },
    include: { guest: { select: { id: true, name: true, email: true } } },
  });
}

async function getInvites(registryId, coupleId) {
  const registry = await prisma.registry.findUnique({ where: { id: registryId } });
  if (!registry) throw new HttpError(404, 'Registry not found');
  if (registry.coupleId !== coupleId) throw new HttpError(403, 'Forbidden');

  return prisma.guestInvite.findMany({
    where: { registryId },
    include: { guest: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

async function respondInvite(guestId, registryId, status) {
  const invite = await prisma.guestInvite.findUnique({
    where: { registryId_guestId: { registryId, guestId } },
  });
  if (!invite) throw new HttpError(404, 'Invite not found');
  if (invite.guestId !== guestId) throw new HttpError(403, 'Forbidden');

  const updated = await prisma.guestInvite.update({
    where: { registryId_guestId: { registryId, guestId } },
    data: { status, respondedAt: new Date() },
  });

  if (status === 'ACCEPTED' || status === 'DECLINED') {
    const registry = await prisma.registry.findUnique({
      where: { id: registryId },
      select: { coupleId: true, title: true }
    });
    const guest = await prisma.user.findUnique({
      where: { id: guestId },
      select: { name: true }
    });
    await prisma.notification.create({
      data: {
        userId: registry.coupleId,
        type: 'INVITE_RESPONDED',
        message: `Гость ${guest.name} ${status === 'ACCEPTED' ? 'принял' : 'отклонил'} приглашение на "${registry.title}"`,
        targetType: 'registry',
        targetId: registryId
      }
    });
  }

  return updated;
}

async function getMyInvites(guestId) {
  return prisma.guestInvite.findMany({
    where: { guestId },
    include: {
      registry: { select: { id: true, title: true, eventDate: true, shareToken: true, coupleId: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

module.exports = { inviteGuest, getInvites, respondInvite, getMyInvites };
