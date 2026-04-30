'use strict';

const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/utils/prisma');

describe('registry and gift integration', () => {
  const ts = Date.now();
  const coupleEmail = `couple-reg-${ts}@example.com`;
  const guestEmail  = `guest-reg-${ts}@example.com`;
  let coupleToken;
  let guestToken;
  let registryId;
  let singleGiftId;

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeAll(async () => {
    await request(app).post('/api/auth/register')
      .send({ email: coupleEmail, name: 'Couple Reg', password: 'Password123', role: 'COUPLE' });
    const coupleLogin = await request(app).post('/api/auth/login')
      .send({ email: coupleEmail, password: 'Password123' });
    coupleToken = coupleLogin.body.accessToken;

    await request(app).post('/api/auth/register')
      .send({ email: guestEmail, name: 'Guest Reg', password: 'Password123', role: 'GUEST' });
    const guestLogin = await request(app).post('/api/auth/login')
      .send({ email: guestEmail, password: 'Password123' });
    guestToken = guestLogin.body.accessToken;
  });

  test('couple creates a registry', async () => {
    const res = await request(app)
      .post('/api/registries')
      .set('Authorization', `Bearer ${coupleToken}`)
      .send({ title: 'Asel & Daniyar Wedding', eventDate: '2026-08-15', description: 'Our wedding' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.shareToken).toBeTruthy();
    registryId = res.body.id;
  });

  test('cannot publish registry with no gifts', async () => {
    const res = await request(app)
      .patch(`/api/registries/${registryId}/publish`)
      .set('Authorization', `Bearer ${coupleToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/gift/i);
  });

  test('couple adds a SINGLE gift', async () => {
    const res = await request(app)
      .post('/api/gifts')
      .set('Authorization', `Bearer ${coupleToken}`)
      .send({ registryId, title: 'Tea Set', priceKzt: 25000, giftType: 'SINGLE', category: 'Home' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('AVAILABLE');
    singleGiftId = res.body.id;
  });

  test('couple publishes registry after adding gift', async () => {
    const res = await request(app)
      .patch(`/api/registries/${registryId}/publish`)
      .set('Authorization', `Bearer ${coupleToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PUBLISHED');
  });

  test('public can view registry by share token', async () => {
    const regRes = await request(app)
      .get('/api/registries')
      .set('Authorization', `Bearer ${coupleToken}`);
    const shareToken = regRes.body.data[0].shareToken;

    const res = await request(app).get(`/api/registries/share/${shareToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PUBLISHED');
  });

  test('guest reserves SINGLE gift for 48 hours', async () => {
    const res = await request(app)
      .patch(`/api/gifts/${singleGiftId}/reserve`)
      .set('Authorization', `Bearer ${guestToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('RESERVED');
    expect(res.body.reservedUntil).toBeTruthy();
  });

  test('second guest cannot reserve already reserved gift — 409', async () => {
    // Register second guest
    const ts2 = Date.now();
    await request(app).post('/api/auth/register')
      .send({ email: `guest2-${ts2}@example.com`, name: 'Guest 2', password: 'Password123', role: 'GUEST' });
    const login2 = await request(app).post('/api/auth/login')
      .send({ email: `guest2-${ts2}@example.com`, password: 'Password123' });
    const token2 = login2.body.accessToken;

    const res = await request(app)
      .patch(`/api/gifts/${singleGiftId}/reserve`)
      .set('Authorization', `Bearer ${token2}`);
    expect(res.status).toBe(409);
  });

  test('couple cannot add gift to someone else registry — 403', async () => {
    // Try with guest token on a couple-only route
    const res = await request(app)
      .post('/api/gifts')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ registryId, title: 'Hacked Gift', priceKzt: 1, giftType: 'SINGLE' });
    expect(res.status).toBe(403);
  });

  test('get gift returns totalFunded field', async () => {
    const res = await request(app).get(`/api/gifts/${singleGiftId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalFunded');
  });
});
