'use strict';

const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/utils/prisma');

describe('contribution atomicity and pool funding integration', () => {
  let coupleToken;
  let guestToken;
  let poolGiftId;

  const ts = Date.now();
  const coupleEmail = `couple-contrib-${ts}@example.com`;
  const guestEmail  = `guest-contrib-${ts}@example.com`;

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeAll(async () => {
    // Register couple
    await request(app).post('/api/auth/register')
      .send({ email: coupleEmail, name: 'Couple Contrib', password: 'Password123', role: 'COUPLE' });
    const coupleLogin = await request(app).post('/api/auth/login')
      .send({ email: coupleEmail, password: 'Password123' });
    coupleToken = coupleLogin.body.accessToken;

    // Register guest
    await request(app).post('/api/auth/register')
      .send({ email: guestEmail, name: 'Guest Contrib', password: 'Password123', role: 'GUEST' });
    const guestLogin = await request(app).post('/api/auth/login')
      .send({ email: guestEmail, password: 'Password123' });
    guestToken = guestLogin.body.accessToken;

    // Couple creates registry
    const registry = await request(app)
      .post('/api/registries')
      .set('Authorization', `Bearer ${coupleToken}`)
      .send({ title: 'Pool Test Wedding', eventDate: '2026-08-15' });

    // Couple adds a POOL gift priced at 10000 KZT
    const gift = await request(app)
      .post('/api/gifts')
      .set('Authorization', `Bearer ${coupleToken}`)
      .send({ registryId: registry.body.id, title: 'Pool Gift', priceKzt: 10000, giftType: 'POOL' });
    poolGiftId = gift.body.id;
  });

  test('guest can contribute to a POOL gift — status starts as PENDING', async () => {
    const res = await request(app)
      .post('/api/contributions')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ giftId: poolGiftId, amountKzt: 3000, originalCurrency: 'KZT', amountOriginal: 3000 });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.giftId).toBe(poolGiftId);
    // Currency snapshot must be locked at creation time
    expect(res.body.exchangeRateAtTime).toBeDefined();
    expect(res.body.lockedAt).toBeDefined();
  });

  test('guest cannot overfund a pool gift', async () => {
    // Contribute 5000 first (total committed: 3000 + 5000 = 8000)
    await request(app)
      .post('/api/contributions')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ giftId: poolGiftId, amountKzt: 5000, originalCurrency: 'KZT', amountOriginal: 5000 });

    // Try to contribute 5000 more — would push total to 13000, over priceKzt=10000
    const overFund = await request(app)
      .post('/api/contributions')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ giftId: poolGiftId, amountKzt: 5000, originalCurrency: 'KZT', amountOriginal: 5000 });

    expect(overFund.status).toBe(409);
    expect(overFund.body.error).toMatch(/overfund/i);
  });

  test('SINGLE gift cannot receive a contribution', async () => {
    // Create a SINGLE gift
    const coupleLogin = await request(app).post('/api/auth/login')
      .send({ email: coupleEmail, password: 'Password123' });
    const cToken = coupleLogin.body.accessToken;

    const registry = await request(app)
      .post('/api/registries')
      .set('Authorization', `Bearer ${cToken}`)
      .send({ title: 'Single Gift Registry', eventDate: '2026-09-01' });

    const gift = await request(app)
      .post('/api/gifts')
      .set('Authorization', `Bearer ${cToken}`)
      .send({ registryId: registry.body.id, title: 'Single Tea Set', priceKzt: 15000, giftType: 'SINGLE' });

    const res = await request(app)
      .post('/api/contributions')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ giftId: gift.body.id, amountKzt: 5000 });

    expect(res.status).toBe(400);
  });

  test('unauthenticated request to contribute is rejected with 401', async () => {
    const res = await request(app)
      .post('/api/contributions')
      .send({ giftId: poolGiftId, amountKzt: 1000 });
    expect(res.status).toBe(401);
  });

  test('COUPLE role cannot contribute (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/contributions')
      .set('Authorization', `Bearer ${coupleToken}`)
      .send({ giftId: poolGiftId, amountKzt: 1000 });
    expect(res.status).toBe(403);
  });
});
