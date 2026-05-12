const { Worker, Queue } = require('bullmq');
const { sendVerificationEmail, sendPasswordResetEmail, sendGiftReservedEmail } = require('../utils/email');

if (process.env.NODE_ENV === 'test') {
  module.exports = {
    emailQueue: {
      add: async () => null
    }
  };
} else {
  const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  };

  // Очередь — экспортируем чтобы добавлять задачи из других файлов
  const emailQueue = new Queue('emails', { connection });

  // Воркер — обрабатывает задачи из очереди
  const emailWorker = new Worker('emails', async (job) => {
    const { type, data } = job.data;

    if (type === 'verification') {
      await sendVerificationEmail(data.to, data.token);
    } else if (type === 'passwordReset') {
      await sendPasswordResetEmail(data.to, data.token);
    } else if (type === 'giftReserved') {
      await sendGiftReservedEmail(data.to, data.giftName, data.reservedBy);
    }
  }, { connection });

  emailWorker.on('completed', (job) => {
    console.log(`Email job ${job.id} (${job.data.type}) completed`);
  });

  emailWorker.on('failed', (job, err) => {
    console.error(`Email job ${job.id} failed:`, err.message);
  });

  module.exports = { emailQueue };
}
