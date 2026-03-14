import { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import type {
  ContactSubmissionParams,
  ListContactSubmissionsQuery,
  UpdateContactSubmissionBody
} from './admin.schema';

const MESSAGE_PREVIEW_LENGTH = 140;

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function toMessagePreview(message: string): string {
  const normalized = message.trim().replace(/\s+/g, ' ');

  if (normalized.length <= MESSAGE_PREVIEW_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MESSAGE_PREVIEW_LENGTH - 3)}...`;
}

function mapInitializationError(fastify: FastifyInstance, error: unknown): never {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    throw fastify.httpErrors.serviceUnavailable('Admin service unavailable');
  }

  throw error;
}

function mapNotFoundError(fastify: FastifyInstance, error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    throw fastify.httpErrors.notFound('Contact submission not found');
  }

  mapInitializationError(fastify, error);
}

export async function listContactSubmissions(
  fastify: FastifyInstance,
  query: ListContactSubmissionsQuery
): Promise<{
  items: Array<{
    id: string;
    name: string;
    email: string;
    messagePreview: string;
    reviewStatus: 'NEW' | 'IN_REVIEW' | 'RESOLVED' | 'SPAM';
    deliveryStatus: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
    deliveryAttempts: number;
    createdAt: string;
    updatedAt: string;
    lastDeliveryAttemptAt: string | null;
    deliveredAt: string | null;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}> {
  const where: Prisma.ContactSubmissionWhereInput = {
    reviewStatus: query.reviewStatus,
    deliveryStatus: query.deliveryStatus
  };

  const skip = (query.page - 1) * query.pageSize;

  const [total, submissions] = await fastify.prisma
    .$transaction([
      fastify.prisma.contactSubmission.count({ where }),
      fastify.prisma.contactSubmission.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: query.pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          message: true,
          reviewStatus: true,
          deliveryStatus: true,
          deliveryAttempts: true,
          createdAt: true,
          updatedAt: true,
          lastDeliveryAttemptAt: true,
          deliveredAt: true
        }
      })
    ])
    .catch((error: unknown) => mapInitializationError(fastify, error));

  return {
    items: submissions.map((submission) => ({
      id: submission.id,
      name: submission.name,
      email: submission.email,
      messagePreview: toMessagePreview(submission.message),
      reviewStatus: submission.reviewStatus,
      deliveryStatus: submission.deliveryStatus,
      deliveryAttempts: submission.deliveryAttempts,
      createdAt: submission.createdAt.toISOString(),
      updatedAt: submission.updatedAt.toISOString(),
      lastDeliveryAttemptAt: toIsoString(submission.lastDeliveryAttemptAt),
      deliveredAt: toIsoString(submission.deliveredAt)
    })),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize)
    }
  };
}

export async function getContactSubmissionById(
  fastify: FastifyInstance,
  params: ContactSubmissionParams
): Promise<{
  submission: {
    id: string;
    name: string;
    email: string;
    message: string;
    reviewStatus: 'NEW' | 'IN_REVIEW' | 'RESOLVED' | 'SPAM';
    deliveryStatus: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
    deliveryAttempts: number;
    lastDeliveryAttemptAt: string | null;
    deliveredAt: string | null;
    lastDeliveryError: string | null;
    createdAt: string;
    updatedAt: string;
  };
}> {
  const submission = await fastify.prisma.contactSubmission
    .findUniqueOrThrow({
      where: {
        id: params.id
      },
      select: {
        id: true,
        name: true,
        email: true,
        message: true,
        reviewStatus: true,
        deliveryStatus: true,
        deliveryAttempts: true,
        lastDeliveryAttemptAt: true,
        deliveredAt: true,
        lastDeliveryError: true,
        createdAt: true,
        updatedAt: true
      }
    })
    .catch((error: unknown) => mapNotFoundError(fastify, error));

  return {
    submission: {
      id: submission.id,
      name: submission.name,
      email: submission.email,
      message: submission.message,
      reviewStatus: submission.reviewStatus,
      deliveryStatus: submission.deliveryStatus,
      deliveryAttempts: submission.deliveryAttempts,
      lastDeliveryAttemptAt: toIsoString(submission.lastDeliveryAttemptAt),
      deliveredAt: toIsoString(submission.deliveredAt),
      lastDeliveryError: submission.lastDeliveryError,
      createdAt: submission.createdAt.toISOString(),
      updatedAt: submission.updatedAt.toISOString()
    }
  };
}

export async function updateContactSubmissionStatus(
  fastify: FastifyInstance,
  params: ContactSubmissionParams,
  body: UpdateContactSubmissionBody
): Promise<{
  submission: {
    id: string;
    reviewStatus: 'NEW' | 'IN_REVIEW' | 'RESOLVED' | 'SPAM';
    updatedAt: string;
  };
}> {
  const submission = await fastify.prisma.contactSubmission
    .update({
      where: {
        id: params.id
      },
      data: {
        reviewStatus: body.reviewStatus
      },
      select: {
        id: true,
        reviewStatus: true,
        updatedAt: true
      }
    })
    .catch((error: unknown) => mapNotFoundError(fastify, error));

  fastify.log.info(
    {
      event: 'contact.submission.review_status.updated',
      submissionId: submission.id,
      reviewStatus: submission.reviewStatus
    },
    'Contact submission review status updated'
  );

  return {
    submission: {
      id: submission.id,
      reviewStatus: submission.reviewStatus,
      updatedAt: submission.updatedAt.toISOString()
    }
  };
}
