import { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { runContactSpamProtection } from './contact.anti-spam';
import { canSendContactNotifications, deliverContactSubmission } from './contact.delivery';
import type { ContactBody, ContactResponse } from './contact.schema';

export async function submitContactRequest(
  fastify: FastifyInstance,
  payload: ContactBody,
  context: { ip: string; userAgent?: string }
): Promise<ContactResponse> {
  if (payload.website && payload.website.trim().length > 0) {
    fastify.log.warn(
      {
        event: 'contact.submission.honeypot_ignored',
        ip: context.ip
      },
      'Honeypot-triggered contact submission ignored'
    );

    return {
      success: true,
      message: 'Contact request received'
    };
  }

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

  const submission = await fastify.prisma.contactSubmission.create({
    data: {
      name: payload.name,
      email: normalizedEmail,
      message: payload.message,
      fingerprint: spamResult.fingerprint,
      ipHash: spamResult.ipHash,
      userAgent: spamResult.userAgent,
      deliveryStatus: canSendContactNotifications(fastify.config) ? 'PENDING' : 'SKIPPED'
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
      submissionId: submission.id,
      nameLength: payload.name.length,
      messageLength: payload.message.length,
      ip: context.ip
    },
    'Contact submission persisted'
  );

  if (canSendContactNotifications(fastify.config)) {
    setImmediate(() => {
      void deliverContactSubmission(fastify.prisma, fastify.log, fastify.config, submission).catch((error) => {
        fastify.log.error(
          {
            err: error,
            submissionId: submission.id
          },
          'Unexpected failure while dispatching contact submission notification'
        );
      });
    });
  }

  return {
    success: true,
    message: 'Contact request received'
  };
}
