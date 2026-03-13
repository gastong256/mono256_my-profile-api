import fastifyJwt from '@fastify/jwt';
import fp from 'fastify-plugin';

export const jwtPlugin = fp(async (fastify) => {
  await fastify.register(fastifyJwt, {
    secret: fastify.config.JWT_SECRET,
    sign: {
      expiresIn: fastify.config.JWT_EXPIRES_IN
    }
  });

  fastify.decorate('authenticate', async (request) => {
    await request.jwtVerify();
  });
}, { name: 'jwt-plugin' });
