'use strict';

const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/utils/prisma');

describe('auth integration — full token lifecycle and RBAC', () => {
  const ts = Date.now();
  const guestEmail  = `guest-auth-${ts}@example.com`;
  const coupleEmail = `couple-auth-${ts}@example.com`;
  let guestTokens;
  let coupleTokens;

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('register guest user — returns user without passwordHash', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ email: guestEmail, name: 'Guest User', password: 'Password123', role: 'GUEST' });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe(guestEmail);
    expect(res.body.role).toBe('GUEST');
    expect(res.body.passwordHash).toBeUndefined();
  });

  test('register couple user', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ email: coupleEmail, name: 'Couple User', password: 'Password123', role: 'COUPLE' });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('COUPLE');
  });

  test('cannot register with the same email twice — 409', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ email: guestEmail, name: 'Duplicate', password: 'Password123' });
    expect(res.status).toBe(409);
  });

  test('login as guest — receives accessToken and refreshToken', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: guestEmail, password: 'Password123' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    guestTokens = res.body;
  });

  test('login as couple', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: coupleEmail, password: 'Password123' });
    expect(res.status).toBe(200);
    coupleTokens = res.body;
  });

  test('wrong password returns 401', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: guestEmail, password: 'WrongPassword1' });
    expect(res.status).toBe(401);
  });

  test('refresh token returns new accessToken', async () => {
    const res = await request(app).post('/api/auth/refresh')
      .send({ refreshToken: guestTokens.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    // New token should differ from the original
    expect(res.body.accessToken).not.toBe(guestTokens.accessToken);
  });

  test('guest cannot access COUPLE-only route — 403', async () => {
    const res = await request(app)
      .post('/api/registries')
      .set('Authorization', `Bearer ${guestTokens.accessToken}`)
      .send({ title: 'Test Registry', eventDate: '2026-08-01' });
    expect(res.status).toBe(403);
  });

  test('unauthenticated request to protected route returns 401', async () => {
    const res = await request(app).get('/api/registries');
    expect(res.status).toBe(401);
  });

  test('couple can access couple-only route', async () => {
    const res = await request(app)
      .post('/api/registries')
      .set('Authorization', `Bearer ${coupleTokens.accessToken}`)
      .send({ title: 'My Wedding', eventDate: '2026-10-10' });
    expect(res.status).toBe(201);
  });

  test('guest cannot access ADMIN route — 403', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${guestTokens.accessToken}`);
    expect(res.status).toBe(403);
  });

  test('invalid token returns 401', async () => {
    const res = await request(app)
      .get('/api/registries')
      .set('Authorization', 'Bearer invalidtokenhere');
    expect(res.status).toBe(401);
  });

  test('logout invalidates refresh token', async () => {
    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${guestTokens.accessToken}`)
      .send({ refreshToken: guestTokens.refreshToken });

    // Trying to refresh with the revoked token should fail
    const res = await request(app).post('/api/auth/refresh')
      .send({ refreshToken: guestTokens.refreshToken });
    expect(res.status).toBe(401);
  });
});
