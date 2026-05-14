'use strict';

if (process.env.NODE_ENV === 'test') {
  module.exports = { emailQueue: { add: async () => null } };
} else {
  const { Worker, Queue } = require('bullmq');
  const {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendGiftReservedEmail,
    sendContributionFundedEmail,
    sendRegistryPublishedEmail,
  } = require('../utils/email');

  const connection = {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  };

  // Queue — exported so other services can add jobs
  const emailQueue = new Queue('emails', { connection });

  // Worker — processes jobs from queue asynchronously
  const emailWorker = new Worker('emails', async (job) => {
    const { type, data } = job.data;
    console.log(`[EmailWorker] Processing job ${job.id} type=${type}`);

    if (type === 'verification')        await sendVerificationEmail(data.to, data.token);
    else if (type === 'passwordReset')  await sendPasswordResetEmail(data.to, data.token);
    else if (type === 'giftReserved')   await sendGiftReservedEmail(data.to, data.giftName, data.reservedBy);
    else if (type === 'contribution')   await sendContributionFundedEmail(data.to, data.giftName, data.amount, data.currency);
    else if (type === 'registryPublished') await sendRegistryPublishedEmail(data.to, data.title, data.shareUrl);
    else console.warn(`[EmailWorker] Unknown job type: ${type}`);
  }, { connection });

  emailWorker.on('completed', (job) => {
    console.log(`[EmailWorker] Job ${job.id} (${job.data.type}) completed`);
  });
  emailWorker.on('failed', (job, err) => {
    console.error(`[EmailWorker] Job ${job.id} failed:`, err.message);
  });

  module.exports = { emailQueue };
}
