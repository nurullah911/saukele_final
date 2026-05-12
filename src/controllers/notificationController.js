'use strict';

const notificationService = require('../services/notificationService');
const prisma = require('../utils/prisma');

async function getNotifications(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const result = await notificationService.getNotifications(req.user.sub, page, limit);
  res.status(200).json(result);
}

async function markRead(req, res) {
  const n = await notificationService.markRead(Number(req.params.id), req.user.sub);
  res.status(200).json(n);
}

async function markAllRead(req, res) {
  await notificationService.markAllRead(req.user.sub);
  res.status(200).json({ message: 'All notifications marked as read' });
}

async function deleteNotification(req, res) {
  await notificationService.deleteNotification(Number(req.params.id), req.user.sub);
  res.status(204).send();
}

// COMPLEXITY: Notification Etiquette
// GET /api/notifications/etiquette?registryId=1
// Returns whether it is currently appropriate to send notifications
async function checkEtiquette(req, res) {
  const registryId = Number(req.query.registryId);
  let registry = null;
  if (registryId) {
    registry = await prisma.registry.findUnique({ where: { id: registryId } });
  }
  const kuttykau = registry ? notificationService.isKuttykauPeriod(registry.eventDate) : false;
  const politeHour = notificationService.isPoliteHour();
  res.status(200).json({
    canSendNotification: !kuttykau && politeHour,
    isKuttykauPeriod: kuttykau,
    isPoliteHour: politeHour,
    explanation: kuttykau
      ? 'Notifications suppressed during құттықтау period (3 days before to 7 days after wedding)'
      : !politeHour
      ? 'Outside polite hours (9:00-20:00). Notification will be queued for morning.'
      : 'Notifications are active — safe to send',
  });
}

module.exports = { getNotifications, markRead, markAllRead, deleteNotification, checkEtiquette };
