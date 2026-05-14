const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { z } = require('zod');
const prisma = require('../utils/prisma');
const HttpError = require('../utils/httpError');
const { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } = require('../utils/jwt');
const { emailQueue } = require('../workers/emailWorker');

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
  const isTest = process.env.NODE_ENV === 'test';
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new HttpError(409, 'Email already exists');

  const passwordHash = await bcrypt.hash(data.password, 12);
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа

  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      role: data.role,
      passwordHash,
      verificationToken: isTest ? null : verificationToken,
      verificationExpiry: isTest ? null : verificationExpiry,
      isVerified: isTest,
      profile: { create: {} }
    }
  });

  // Отправляем письмо через очередь (не блокируем API)
  if (!isTest) {
    await emailQueue.add('send-verification', {
      type: 'verification',
      data: { to: user.email, token: verificationToken }
    });
  }

  return {
    ...publicUser(user),
    message: isTest
      ? 'Registration successful.'
      : 'Registration successful. Please check your email to verify your account.'
  };
}

async function verifyEmail(token) {
  if (!token) throw new HttpError(400, 'Token is required');

  const user = await prisma.user.findFirst({
    where: {
      verificationToken: token,
      verificationExpiry: { gt: new Date() }
    }
  });

  if (!user) throw new HttpError(400, 'Invalid or expired verification token');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      verificationToken: null,
      verificationExpiry: null
    }
  });

  return { message: 'Email verified successfully. You can now log in.' };
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
  if (!user.isVerified) throw new HttpError(403, 'Please verify your email before logging in');

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
  } catch (_error) {
    throw new HttpError(401, 'Invalid or expired refresh token');
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.expiresAt < new Date()) throw new HttpError(401, 'Invalid or expired refresh token');

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.isSuspended) throw new HttpError(401, 'Invalid refresh token');

  await prisma.refreshToken.delete({ where: { tokenHash } });
  return issueTokens(user);
}

async function logout(refreshToken) {
  if (!refreshToken) throw new HttpError(401, 'Refresh token is required');
  await prisma.refreshToken.deleteMany({ where: { tokenHash: hashToken(refreshToken) } });
}

async function forgotPassword(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Не говорим существует ли email — защита от enumeration
  if (!user) return { message: 'If this email exists, a reset link has been sent.' };

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 час

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetExpiry }
  });

  await emailQueue.add('send-password-reset', {
    type: 'passwordReset',
    data: { to: user.email, token: resetToken }
  });

  return { message: 'If this email exists, a reset link has been sent.' };
}

async function resetPassword(token, newPassword) {
  if (!token) throw new HttpError(400, 'Token is required');

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetExpiry: { gt: new Date() }
    }
  });

  if (!user) throw new HttpError(400, 'Invalid or expired reset token');

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetExpiry: null
    }
  });

  // Удаляем все refresh токены — принудительный logout со всех устройств
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

  return { message: 'Password reset successful. Please log in with your new password.' };
}

module.exports = { register, login, refresh, logout, publicUser, verifyEmail, forgotPassword, resetPassword };
