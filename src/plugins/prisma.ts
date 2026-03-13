import fp from 'fastify-plugin';
import { prisma } from '../lib/prisma';

export const prismaPlugin = fp(async (fastify) => {
  fastify.decorate('prisma', prisma);

  fastify.addHook('onReady', async () => {
    if (fastify.config.NODE_ENV === 'test') {
      return;
    }

    await fastify.prisma.$connect();
    fastify.log.info('Prisma connected');
  });

  fastify.addHook('onClose', async () => {
    await fastify.prisma.$disconnect();
  });
}, { name: 'prisma-plugin' });
