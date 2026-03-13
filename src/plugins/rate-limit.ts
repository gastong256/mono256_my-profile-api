import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';

export const rateLimitPlugin = fp(async (fastify) => {
  if (!fastify.config.RATE_LIMIT_ENABLED) {
    fastify.log.warn('Rate limiting is disabled');
    return;
  }

  await fastify.register(rateLimit, {
    global: false
  });
}, { name: 'rate-limit-plugin' });
