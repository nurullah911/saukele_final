const { Resend } = require('resend');

const FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// В тестах не отправляем реальные письма
const isTest = process.env.NODE_ENV === 'test';
const resend = isTest ? null : new Resend(process.env.RESEND_API_KEY);

async function sendVerificationEmail(to, token) {
  if (isTest) return;
  const link = `${FRONTEND_URL}/verify-email?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Подтвердите ваш аккаунт — Saukele',
    html: `
      <h2>Добро пожаловать в Saukele!</h2>
      <p>Нажмите на ссылку ниже чтобы подтвердить ваш email:</p>
      <a href="${link}">${link}</a>
      <p>Ссылка действует 24 часа.</p>
    `
  });
}

async function sendPasswordResetEmail(to, token) {
  if (isTest) return;
  const link = `${FRONTEND_URL}/reset-password?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Сброс пароля — Saukele',
    html: `
      <h2>Сброс пароля</h2>
      <p>Нажмите на ссылку ниже чтобы сбросить пароль:</p>
      <a href="${link}">${link}</a>
      <p>Ссылка действует 1 час.</p>
    `
  });
}

async function sendGiftReservedEmail(to, giftName, reservedBy) {
  if (isTest) return;
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Подарок зарезервирован — Saukele',
    html: `
      <h2>Хорошие новости!</h2>
      <p>Гость <strong>${reservedBy}</strong> зарезервировал подарок: <strong>${giftName}</strong>.</p>
    `
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendGiftReservedEmail };