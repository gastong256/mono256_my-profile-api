import fp from 'fastify-plugin';
import { hashPassword } from '../shared/utils/password';

export const bootstrapAdminPlugin = fp(async (fastify) => {
  fastify.addHook('onReady', async () => {
    if (!fastify.config.BOOTSTRAP_ADMIN_ENABLED) {
      return;
    }

    const email = fastify.config.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase();
    const name = fastify.config.BOOTSTRAP_ADMIN_NAME;
    const password = fastify.config.BOOTSTRAP_ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error(
        'BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required when BOOTSTRAP_ADMIN_ENABLED=true'
      );
    }

    const existingUser = await fastify.prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });

    const passwordHash = await hashPassword(password);

    if (!existingUser) {
      await fastify.prisma.user.create({
        data: {
          email,
          name,
          passwordHash
        }
      });

      fastify.log.info({ email }, 'Bootstrap admin user created');
      return;
    }

    if (!fastify.config.BOOTSTRAP_ADMIN_UPDATE_EXISTING) {
      fastify.log.info({ email }, 'Bootstrap admin user already exists, skipping update');
      return;
    }

    await fastify.prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name,
        passwordHash
      }
    });

    fastify.log.warn({ email }, 'Bootstrap admin user updated from startup configuration');
  });
}, { name: 'bootstrap-admin-plugin', dependencies: ['prisma-plugin'] });
