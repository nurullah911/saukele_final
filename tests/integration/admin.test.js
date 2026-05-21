'use strict';

const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/utils/prisma');
const { signAccessToken } = require('../../src/utils/jwt');

describe('admin user actions', () => {
  const ts = Date.now();
  const adminEmail = `admin-actions-${ts}@example.com`;
  const guestEmail = `guest-actions-${ts}@example.com`;
  const targetEmail = `target-actions-${ts}@example.com`;
  let adminUser;
  let guestUser;
  let targetUser;
  let adminToken;
  let guestToken;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, guestEmail, targetEmail] } }
    });

    adminUser = await prisma.user.create({
      data: { email: adminEmail, name: 'Admin Actions', role: 'ADMIN', isVerified: true }
    });
    guestUser = await prisma.user.create({
      data: { email: guestEmail, name: 'Guest Actions', role: 'GUEST', isVerified: true }
    });
    targetUser = await prisma.user.create({
      data: {
        email: targetEmail,
        name: 'Suspended Target',
        role: 'GUEST',
        isVerified: true,
        isSuspended: true
      }
    });

    adminToken = signAccessToken(adminUser);
    guestToken = signAccessToken(guestUser);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, guestEmail, targetEmail] } }
    });
    await prisma.$disconnect();
  });

  test('admin can unsuspend a suspended user', async () => {
    await prisma.user.update({ where: { id: targetUser.id }, data: { isSuspended: true } });

    const res = await request(app)
      .patch(`/api/admin/users/${targetUser.id}/unsuspend`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('User unsuspended successfully');
    expect(res.body.user.isSuspended).toBe(false);

    const updated = await prisma.user.findUnique({ where: { id: targetUser.id } });
    expect(updated.isSuspended).toBe(false);
  });

  test('non-admin cannot unsuspend a suspended user', async () => {
    await prisma.user.update({ where: { id: targetUser.id }, data: { isSuspended: true } });

    const res = await request(app)
      .patch(`/api/admin/users/${targetUser.id}/unsuspend`)
      .set('Authorization', `Bearer ${guestToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');

    const unchanged = await prisma.user.findUnique({ where: { id: targetUser.id } });
    expect(unchanged.isSuspended).toBe(true);
  });

  test('unsuspending nonexistent user returns 404', async () => {
    const res = await request(app)
      .patch('/api/admin/users/999999999/unsuspend')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('User not found');
  });
});
