'use strict';

const FROM = process.env.EMAIL_FROM || 'noreply@saukele.kz';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const isTest = process.env.NODE_ENV === 'test';

async function sendEmail({ to, subject, html }) {
  if (isTest) return { messageId: 'test-mock' };
  if (!process.env.BREVO_API_KEY) {
    console.warn('[Email] BREVO_API_KEY not set — skipping');
    return;
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Saukele', email: FROM },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('[Email] Brevo error:', err);
    throw new Error(`Brevo API error: ${response.status}`);
  }

  return response.json();
}

async function sendVerificationEmail(to, token) {
  const link = `${FRONTEND_URL}/verify-email?token=${token}`;
  return sendEmail({
    to,
    subject: 'Подтвердите ваш аккаунт — Saukele',
    html: `
      <h2>Добро пожаловать в Saukele!</h2>
      <p>Нажмите на ссылку ниже чтобы подтвердить ваш email:</p>
      <a href="${link}" style="background:#2E75B6;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">Подтвердить email</a>
      <p>Или скопируйте ссылку: ${link}</p>
      <p>Ссылка действует 24 часа.</p>
    `,
  });
}

async function sendPasswordResetEmail(to, token) {
  const link = `${FRONTEND_URL}/reset-password?token=${token}`;
  return sendEmail({
    to,
    subject: 'Сброс пароля — Saukele',
    html: `
      <h2>Сброс пароля</h2>
      <p>Нажмите на ссылку ниже чтобы установить новый пароль:</p>
      <a href="${link}" style="background:#2E75B6;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">Сбросить пароль</a>
      <p>Или скопируйте ссылку: ${link}</p>
      <p>Ссылка действует 1 час.</p>
    `,
  });
}

async function sendGiftReservedEmail(to, giftName, reservedBy) {
  return sendEmail({
    to,
    subject: 'Подарок зарезервирован — Saukele',
    html: `
      <h2>Хорошие новости!</h2>
      <p>Гость <strong>${reservedBy}</strong> зарезервировал подарок: <strong>${giftName}</strong>.</p>
      <p>Откройте ваш реестр чтобы увидеть актуальный статус.</p>
    `,
  });
}

async function sendContributionFundedEmail(to, giftName, amount, currency) {
  return sendEmail({
    to,
    subject: 'Новый вклад в подарок — Saukele',
    html: `
      <h2>Новый вклад!</h2>
      <p>Гость внёс <strong>${amount} ${currency}</strong> в подарок: <strong>${giftName}</strong>.</p>
    `,
  });
}

async function sendRegistryPublishedEmail(to, registryTitle, shareUrl) {
  return sendEmail({
    to,
    subject: 'Ваш реестр опубликован — Saukele',
    html: `
      <h2>Реестр опубликован!</h2>
      <p>Ваш реестр <strong>${registryTitle}</strong> теперь доступен гостям.</p>
      <a href="${shareUrl}" style="background:#2E75B6;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">Открыть реестр</a>
    `,
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendGiftReservedEmail,
  sendContributionFundedEmail,
  sendRegistryPublishedEmail,
};