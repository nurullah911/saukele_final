'use strict';

const FROM = process.env.EMAIL_FROM;
const FRONTEND_URL = process.env.FRONTEND_URL;
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

function linkFor(path, token) {
  return `${FRONTEND_URL}${path}?token=${encodeURIComponent(token)}`;
}

async function sendEmail({ to, subject, html, fallbackLink, fallbackToken }) {
  if (isTest) return { messageId: 'test-mock' };

  if (!process.env.BREVO_API_KEY) {
    const message = '[Email] BREVO_API_KEY is not set';
    if (isProduction) {
      console.error(`${message}; email was not sent to ${to}`);
      throw new Error('BREVO_API_KEY is required to send email in production');
    }

    console.warn(`${message}; development fallback for ${to}`);
    if (fallbackLink) console.warn(`[Email] Link: ${fallbackLink}`);
    if (fallbackToken) console.warn(`[Email] Token: ${fallbackToken}`);
    return { messageId: 'development-fallback' };
  }

  if (!FROM) {
    throw new Error('EMAIL_FROM is required and must be a Brevo verified sender');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
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
    console.error(`[Email] Brevo rejected email to ${to}. status=${response.status} response=${err}`);
    throw new Error(`Brevo API error: ${response.status}`);
  }

  const result = await response.json();
  console.log(`[Email] Brevo accepted email to ${to}`);
  return result;
}

async function sendVerificationEmail(to, token) {
  const link = linkFor('/verify-email', token);
  return sendEmail({
    to,
    subject: 'Подтвердите ваш аккаунт - Saukele',
    fallbackLink: link,
    fallbackToken: token,
    html: `
      <h2>Добро пожаловать в Saukele!</h2>
      <p>Нажмите на ссылку ниже, чтобы подтвердить ваш email:</p>
      <a href="${link}" style="background:#2E75B6;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">Подтвердить email</a>
      <p>Или скопируйте ссылку: ${link}</p>
      <p>Ваш код подтверждения: ${token}</p>
      <p>Ссылка действует 24 часа.</p>
    `,
  });
}

async function sendPasswordResetEmail(to, token) {
  const link = linkFor('/reset-password', token);
  return sendEmail({
    to,
    subject: 'Сброс пароля - Saukele',
    fallbackLink: link,
    fallbackToken: token,
    html: `
      <h2>Сброс пароля</h2>
      <p>Нажмите на ссылку ниже, чтобы установить новый пароль:</p>
      <a href="${link}" style="background:#2E75B6;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">Сбросить пароль</a>
      <p>Или скопируйте ссылку: ${link}</p>
      <p>Ссылка действует 1 час.</p>
    `,
  });
}

async function sendGiftReservedEmail(to, giftName, reservedBy) {
  return sendEmail({
    to,
    subject: 'Подарок зарезервирован - Saukele',
    html: `
      <h2>Хорошие новости!</h2>
      <p>Гость <strong>${reservedBy}</strong> зарезервировал подарок: <strong>${giftName}</strong>.</p>
      <p>Откройте ваш реестр, чтобы увидеть актуальный статус.</p>
    `,
  });
}

async function sendContributionFundedEmail(to, giftName, amount, currency) {
  return sendEmail({
    to,
    subject: 'Новый вклад в подарок - Saukele',
    html: `
      <h2>Новый вклад!</h2>
      <p>Гость внес <strong>${amount} ${currency}</strong> в подарок: <strong>${giftName}</strong>.</p>
    `,
  });
}

async function sendRegistryPublishedEmail(to, registryTitle, shareUrl) {
  return sendEmail({
    to,
    subject: 'Ваш реестр опубликован - Saukele',
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
