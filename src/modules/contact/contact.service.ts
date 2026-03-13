import { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import type { ContactBody, ContactResponse } from './contact.schema';

export async function submitContactRequest(
  fastify: FastifyInstance,
  payload: ContactBody
): Promise<ContactResponse> {
  await fastify.prisma.contactSubmission.create({
    data: {
      name: payload.name,
      email: payload.email,
      message: payload.message
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
      messageLength: payload.message.length
    },
    'Contact submission persisted'
  );

  return {
    success: true,
    message: 'Contact request received'
  };
}
