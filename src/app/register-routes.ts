import type { FastifyInstance } from 'fastify';
import { authRoute } from '../modules/auth/auth.route';
import { contactRoute } from '../modules/contact/contact.route';
import { healthRoute } from '../modules/health/health.route';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoute);
  await app.register(contactRoute);
  await app.register(authRoute);
}
