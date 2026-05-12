'use strict';

const prisma = require('../utils/prisma');

// COMPLEXITY: Notification Etiquette
// Never remind during "құттықтау" (congratulation) period — 3 days before to 7 days after wedding
// Gentle nudges only — no notifications outside polite hours (9:00-20:00)

function isKuttykauPeriod(eventDate) {
  const now = new Date();
  const event = new Date(eventDate);
  const before = new Date(event);
  before.setDate(before.getDate() - 3);
  const after = new Date(event);
  after.setDate(after.getDate() + 7);
  return now >= before && now <= after;
}

function isPoliteHour() {
  const hour = new Date().getHours();
  return hour >= 9 && hour < 20;
}

async function createNotification({ userId, type, message, targetType, targetId }) {
  return prisma.notification.create({
    data: { userId, type, message, targetType, targetId },
  });
}

async function sendEtiquetteNotification({ userId, type, message, targetType, targetId, registryId }) {
  let registry = null;
  if (registryId) {
    registry = await prisma.registry.findUnique({ where: { id: registryId } });
  }
  if (registry && isKuttykauPeriod(registry.eventDate)) {
    console.log(`[Notification] Suppressed during құттықтау period for registry ${registryId}`);
    return null;
  }
  if (!isPoliteHour()) {
    console.log('[Notification] Suppressed — outside polite hours (9:00-20:00)');
    return null;
  }
  return createNotification({ userId, type, message, targetType, targetId });
}

async function getNotifications(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [data, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);
  return { data, total, page, limit, unreadCount };
}

async function markRead(notificationId, userId) {
  const n = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!n || n.userId !== userId) throw new (require('../utils/httpError'))(404, 'Notification not found');
  return prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
}

async function markAllRead(userId) {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}

async function deleteNotification(notificationId, userId) {
  const n = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!n || n.userId !== userId) throw new (require('../utils/httpError'))(404, 'Notification not found');
  await prisma.notification.delete({ where: { id: notificationId } });
}

module.exports = { createNotification, sendEtiquetteNotification, getNotifications, markRead, markAllRead, deleteNotification, isKuttykauPeriod, isPoliteHour };
