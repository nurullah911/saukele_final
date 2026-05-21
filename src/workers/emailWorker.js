'use strict';

if (process.env.NODE_ENV === 'test') {
  module.exports = { emailQueue: { add: async () => null } };
} else {
  const { Worker, Queue } = require('bullmq');
  const { createRedisClient, getRedisConnectionOptions } = require('../utils/redis');
  const {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendGiftReservedEmail,
    sendContributionFundedEmail,
    sendRegistryPublishedEmail,
  } = require('../utils/email');

  if (!getRedisConnectionOptions({ forBullMq: true })) {
    const message = '[EmailWorker] Redis is not configured. Set REDIS_URL or REDIS_HOST/REDIS_PORT.';
    if (process.env.NODE_ENV === 'production') console.error(message);
    else console.warn(`${message} Email jobs will fail until Redis is available.`);
  }

  const connection = createRedisClient({ forBullMq: true });

  if (!connection) {
    module.exports = {
      emailQueue: {
        add: async () => {
          throw new Error('Redis is not configured. Set REDIS_URL or REDIS_HOST/REDIS_PORT to enqueue email jobs.');
        },
      },
    };
  } else {
    const emailQueue = new Queue('emails', { connection });

    const emailWorker = new Worker('emails', async (job) => {
      const { type, data } = job.data;
      console.log(`[EmailWorker] Processing job ${job.id} type=${type}`);

      if (type === 'verification') return sendVerificationEmail(data.to, data.token);
      if (type === 'passwordReset') return sendPasswordResetEmail(data.to, data.token);
      if (type === 'giftReserved') return sendGiftReservedEmail(data.to, data.giftName, data.reservedBy);
      if (type === 'contribution') return sendContributionFundedEmail(data.to, data.giftName, data.amount, data.currency);
      if (type === 'registryPublished') return sendRegistryPublishedEmail(data.to, data.title, data.shareUrl);

      throw new Error(`Unknown email job type: ${type}`);
    }, { connection });

    emailWorker.on('completed', (job) => {
      console.log(`[EmailWorker] Job ${job.id} (${job.data.type}) completed`);
    });

    emailWorker.on('failed', (job, err) => {
      console.error(`[EmailWorker] Job ${job?.id || 'unknown'} failed:`, err.message);
    });

    emailWorker.on('error', (err) => {
      console.error('[EmailWorker] Worker error:', err.message);
    });

    module.exports = { emailQueue };
  }
}
