const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../utils/prisma');
const HttpError = require('../utils/httpError');
const { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } = require('../utils/jwt');

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(8).regex(/[A-Za-z]/).regex(/[0-9]/),
  role: z.enum(['COUPLE', 'GUEST']).optional().default('GUEST')
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

async function register(input) {
  const data = registerSchema.parse(input);
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new HttpError(409, 'Email already exists');

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      role: data.role,
      passwordHash,
      profile: { create: {} }
    }
  });
  return publicUser(user);
}

async function issueTokens(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const payload = verifyRefreshToken(refreshToken);
  const expiresAt = new Date(payload.exp * 1000);
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hashToken(refreshToken), expiresAt }
  });
  return { accessToken, refreshToken };
}

async function login(input) {
  const data = loginSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || !user.passwordHash) throw new HttpError(401, 'Invalid credentials');
  if (user.isSuspended) throw new HttpError(403, 'User is suspended');

  const ok = await bcrypt.compare(data.password, user.passwordHash);
  if (!ok) throw new HttpError(401, 'Invalid credentials');

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return issueTokens(user);
}

async function refresh(refreshToken) {
  if (!refreshToken) throw new HttpError(401, 'Refresh token is required');
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new HttpError(401, 'Invalid or expired refresh token');
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.expiresAt < new Date()) throw new HttpError(401, 'Invalid or expired refresh token');

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.isSuspended) throw new HttpError(401, 'Invalid refresh token');

  // TOKEN ROTATION: delete old refresh token, issue new pair
  await prisma.refreshToken.delete({ where: { tokenHash } });
  return issueTokens(user);
}

async function logout(refreshToken) {
  if (!refreshToken) throw new HttpError(401, 'Refresh token is required');
  await prisma.refreshToken.deleteMany({ where: { tokenHash: hashToken(refreshToken) } });
}

module.exports = { register, login, refresh, logout, publicUser };
