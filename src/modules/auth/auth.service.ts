import { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import type { LoginBody } from './auth.schema';
import type { AuthUser, JwtUserPayload, LoginResponse } from './auth.types';
import { verifyPassword } from '../../shared/utils/password';

function toAuthUser(user: { id: string; email: string; name: string }): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name
  };
}

export async function loginWithPassword(
  fastify: FastifyInstance,
  payload: LoginBody
): Promise<LoginResponse> {
  const normalizedEmail = payload.email.toLowerCase();

  const user = await fastify.prisma.user
    .findUnique({
      where: { email: normalizedEmail }
    })
    .catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientInitializationError) {
        throw fastify.httpErrors.serviceUnavailable('Authentication service unavailable');
      }
      throw error;
    });

  if (!user) {
    throw fastify.httpErrors.unauthorized('Invalid credentials');
  }

  const passwordMatches = await verifyPassword(payload.password, user.passwordHash);

  if (!passwordMatches) {
    throw fastify.httpErrors.unauthorized('Invalid credentials');
  }

  const jwtPayload: JwtUserPayload = {
    sub: user.id,
    email: user.email,
    name: user.name
  };

  const accessToken = fastify.jwt.sign(jwtPayload);

  fastify.log.info({ userId: user.id }, 'User authenticated');

  return {
    accessToken,
    tokenType: 'Bearer',
    expiresIn: fastify.config.JWT_EXPIRES_IN,
    user: toAuthUser(user)
  };
}

export async function getAuthenticatedUser(
  fastify: FastifyInstance,
  jwtUser: JwtUserPayload
): Promise<{ user: AuthUser }> {
  const user = await fastify.prisma.user
    .findUnique({
      where: { id: jwtUser.sub },
      select: {
        id: true,
        email: true,
        name: true
      }
    })
    .catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientInitializationError) {
        throw fastify.httpErrors.serviceUnavailable('Authentication service unavailable');
      }
      throw error;
    });

  if (!user) {
    throw fastify.httpErrors.unauthorized('User not found');
  }

  return {
    user: toAuthUser(user)
  };
}
