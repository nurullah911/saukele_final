'use strict';

const Redis = require('ioredis');

let client = null;

function getRedisClient() {
  if (client) return client;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('[Redis] REDIS_URL not set — rate limiting will use memory store');
    return null;
  }

  client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  client.on('connect', () => console.log('[Redis] Connected'));
  client.on('error', (err) => console.error('[Redis] Error:', err.message));

  return client;
}

module.exports = { getRedisClient };
