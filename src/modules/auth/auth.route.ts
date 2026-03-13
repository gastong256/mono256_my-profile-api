import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { errorResponseSchema } from '../../shared/schemas/error.schema';
import { loginBodySchema, loginResponseSchema, meResponseSchema } from './auth.schema';
import { getAuthenticatedUser, loginWithPassword } from './auth.service';

export const authRoute: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const loginRateLimitConfig = fastify.config.RATE_LIMIT_ENABLED
    ? {
      config: {
        rateLimit: {
          max: fastify.config.AUTH_RATE_LIMIT_MAX,
          timeWindow: fastify.config.AUTH_RATE_LIMIT_WINDOW
        }
      }
    }
    : {};

  app.post('/auth/login', {
    ...loginRateLimitConfig,
    schema: {
      tags: ['Auth'],
      summary: 'Login with email and password',
      body: loginBodySchema,
      response: {
        200: loginResponseSchema,
        401: errorResponseSchema,
        429: errorResponseSchema,
        503: errorResponseSchema
      }
    }
  }, async (request) => {
    const payload = loginBodySchema.parse(request.body);
    return loginWithPassword(fastify, payload);
  });

  app.get('/auth/me', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Auth'],
      summary: 'Return currently authenticated user',
      security: [{ bearerAuth: [] }],
      response: {
        200: meResponseSchema,
        401: errorResponseSchema,
        503: errorResponseSchema
      }
    }
  }, async (request) => getAuthenticatedUser(fastify, request.user));
};
