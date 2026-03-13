import type { FastifyInstance } from 'fastify';
import type { HealthResponse, ReadinessDegradedResponse, ReadinessOkResponse } from './health.schema';

export function getHealth(): HealthResponse {
  return {
    status: 'ok',
    service: 'mono256_my-profile-api'
  };
}

export async function getReadiness(
  fastify: FastifyInstance
): Promise<ReadinessOkResponse | ReadinessDegradedResponse> {
  try {
    await fastify.prisma.$queryRaw`SELECT 1`;

    return {
      status: 'ok',
      service: 'mono256_my-profile-api',
      dependencies: {
        database: 'up'
      }
    };
  } catch (error) {
    fastify.log.error({ err: error }, 'Readiness check failed');

    return {
      status: 'degraded',
      service: 'mono256_my-profile-api',
      dependencies: {
        database: 'down'
      }
    };
  }
}
