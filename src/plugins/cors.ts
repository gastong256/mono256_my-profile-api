import cors from '@fastify/cors';
import fp from 'fastify-plugin';

export const corsPlugin = fp(async (fastify) => {
  const allowedOrigins = fastify.config.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  await fastify.register(cors, {
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS policy'), false);
    }
  });
}, { name: 'cors-plugin' });
