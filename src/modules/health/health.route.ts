import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  healthResponseSchema,
  readinessDegradedResponseSchema,
  readinessOkResponseSchema
} from './health.schema';
import { getHealth, getReadiness } from './health.service';

export const healthRoute: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get('/health', {
    schema: {
      tags: ['Health'],
      summary: 'Liveness check endpoint',
      response: {
        200: healthResponseSchema
      }
    }
  }, async () => getHealth());

  app.get('/ready', {
    schema: {
      tags: ['Health'],
      summary: 'Readiness check endpoint',
      response: {
        200: readinessOkResponseSchema,
        503: readinessDegradedResponseSchema
      }
    }
  }, async (_request, reply) => {
    const readiness = await getReadiness(fastify);

    if (readiness.status === 'degraded') {
      return reply.status(503).send(readiness);
    }

    return readiness;
  });
};
