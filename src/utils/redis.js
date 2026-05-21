'use strict';

const Redis = require('ioredis');

let client = null;

function getRedisConnectionOptions({ forBullMq = false } = {}) {
  const common = forBullMq ? { maxRetriesPerRequest: null } : { maxRetriesPerRequest: 3 };

  if (process.env.REDIS_URL) {
    return {
      connection: process.env.REDIS_URL,
      options: common,
      label: 'REDIS_URL',
    };
  }

  if (process.env.REDIS_HOST) {
    return {
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
      options: common,
      label: `${process.env.REDIS_HOST}:${process.env.REDIS_PORT || '6379'}`,
    };
  }

  return null;
}

function createRedisClient({ forBullMq = false } = {}) {
  const config = getRedisConnectionOptions({ forBullMq });
  if (!config) return null;

  const redis = typeof config.connection === 'string'
    ? new Redis(config.connection, config.options)
    : new Redis({ ...config.connection, ...config.options });

  redis.on('connect', () => console.log(`[Redis] Connected via ${config.label}`));
  redis.on('error', (err) => console.error('[Redis] Connection error:', err.message));

  return redis;
}

function getRedisClient() {
  if (client) return client;

  client = createRedisClient();
  if (!client) {
    const message = '[Redis] REDIS_URL not set and REDIS_HOST not set';
    if (process.env.NODE_ENV === 'production') console.error(`${message}; Redis-backed features will fail`);
    else console.warn(`${message}; falling back where possible`);
    return null;
  }

  return client;
}

module.exports = { getRedisClient, createRedisClient, getRedisConnectionOptions };
