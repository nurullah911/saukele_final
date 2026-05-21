require('dotenv').config();

const required = [
  'DATABASE_URL',
  'JWT_SECRET',
  'REFRESH_SECRET',
  'NODE_ENV',
  'FRONTEND_URL'
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

if (process.env.JWT_SECRET.length < 64 || process.env.REFRESH_SECRET.length < 64) {
  console.error('JWT_SECRET and REFRESH_SECRET must be at least 64 characters long.');
  process.exit(1);
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV,
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  redisHost: process.env.REDIS_HOST,
  redisPort: Number(process.env.REDIS_PORT || 6379),
  jwtSecret: process.env.JWT_SECRET,
  refreshSecret: process.env.REFRESH_SECRET,
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
  brevoApiKey: process.env.BREVO_API_KEY,
  emailFrom: process.env.EMAIL_FROM,
  frontendUrl: process.env.FRONTEND_URL
};
