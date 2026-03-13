import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { errorResponseSchema } from '../../shared/schemas/error.schema';
import { contactBodySchema, contactResponseSchema } from './contact.schema';
import { submitContactRequest } from './contact.service';

export const contactRoute: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const contactRateLimitConfig = fastify.config.RATE_LIMIT_ENABLED
    ? {
      config: {
        rateLimit: {
          max: fastify.config.CONTACT_RATE_LIMIT_MAX,
          timeWindow: fastify.config.CONTACT_RATE_LIMIT_WINDOW
        }
      }
    }
    : {};

  app.post('/contact', {
    ...contactRateLimitConfig,
    schema: {
      tags: ['Contact'],
      summary: 'Submit a contact request',
      body: contactBodySchema,
      response: {
        200: contactResponseSchema,
        400: errorResponseSchema,
        429: errorResponseSchema,
        503: errorResponseSchema
      }
    }
  }, async (request) => {
    const payload = contactBodySchema.parse(request.body);
    return submitContactRequest(fastify, payload);
  });
};
