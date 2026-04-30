const prisma = require('../utils/prisma');
const { publicUser } = require('../services/authService');

async function listUsers(req, res) {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
  const [users, total] = await Promise.all([
    prisma.user.findMany({ skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.user.count()
  ]);
  res.status(200).json({ data: users.map(publicUser), total, page });
}

module.exports = { listUsers };
