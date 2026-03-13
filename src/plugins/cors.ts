import cors from '@fastify/cors';
import fp from 'fastify-plugin';

export const corsPlugin = fp(async (fastify) => {
  const normalizeOrigin = (origin: string): string => {
    const trimmed = origin.trim();

    if (trimmed === '*') {
      return trimmed;
    }

    try {
      return new URL(trimmed).origin;
    } catch {
      return trimmed.replace(/\/+$/, '');
    }
  };

  const allowedOrigins = new Set(
    fastify.config.CORS_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
      .map(normalizeOrigin)
  );

  if (fastify.config.APP_BASE_URL) {
    allowedOrigins.add(normalizeOrigin(fastify.config.APP_BASE_URL));
  }

  await fastify.register(cors, {
    credentials: true,
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = normalizeOrigin(origin);

      if (allowedOrigins.has('*') || allowedOrigins.has(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      const error = fastify.httpErrors.forbidden('Origin not allowed by CORS policy');
      error.code = 'CORS_ORIGIN_DENIED';

      callback(error, false);
    }
  });
}, { name: 'cors-plugin' });
