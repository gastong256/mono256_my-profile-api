import type { FastifyInstance } from 'fastify';
import { corsPlugin } from '../plugins/cors';
import { helmetPlugin } from '../plugins/helmet';
import { jwtPlugin } from '../plugins/jwt';
import { prismaPlugin } from '../plugins/prisma';
import { rateLimitPlugin } from '../plugins/rate-limit';
import { sensiblePlugin } from '../plugins/sensible';
import { swaggerPlugin } from '../plugins/swagger';

export async function registerPlugins(app: FastifyInstance): Promise<void> {
  await app.register(sensiblePlugin);
  await app.register(helmetPlugin);
  await app.register(corsPlugin);
  await app.register(rateLimitPlugin);
  await app.register(jwtPlugin);
  await app.register(prismaPlugin);
  await app.register(swaggerPlugin);
}
