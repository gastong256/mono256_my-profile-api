import { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { runContactSpamProtection } from './contact.anti-spam';
import type { ContactBody, ContactResponse } from './contact.schema';

export async function submitContactRequest(
  fastify: FastifyInstance,
  payload: ContactBody,
  context: { ip: string; userAgent?: string }
): Promise<ContactResponse> {
  const normalizedEmail = payload.email.toLowerCase();

  const spamResult = await runContactSpamProtection(fastify, payload, {
    ip: context.ip,
    userAgent: context.userAgent
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientInitializationError) {
      throw fastify.httpErrors.serviceUnavailable('Contact service unavailable');
    }
    throw error;
  });

  if (spamResult.dropAsDuplicate) {
    fastify.log.warn(
      {
        event: 'contact.submission.duplicate_ignored',
        ip: context.ip
      },
      'Duplicate contact submission ignored'
    );

    return {
      success: true,
      message: 'Contact request received'
    };
  }

  await fastify.prisma.contactSubmission.create({
    data: {
      name: payload.name,
      email: normalizedEmail,
      message: payload.message,
      fingerprint: spamResult.fingerprint,
      ipHash: spamResult.ipHash,
      userAgent: spamResult.userAgent
    }
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientInitializationError) {
      throw fastify.httpErrors.serviceUnavailable('Contact service unavailable');
    }
    throw error;
  });

  fastify.log.info(
    {
      event: 'contact.submission.created',
      nameLength: payload.name.length,
      messageLength: payload.message.length,
      ip: context.ip
    },
    'Contact submission persisted'
  );

  return {
    success: true,
    message: 'Contact request received'
  };
}
