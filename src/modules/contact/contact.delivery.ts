import type { ContactDeliveryStatus, ContactSubmission, PrismaClient } from '@prisma/client';
import type { AppConfig } from '../../config/env';

type ContactDeliveryLogger = {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

type ContactDeliveryCandidate = Pick<
  ContactSubmission,
  'id' |
  'name' |
  'subject' |
  'email' |
  'message' |
  'createdAt' |
  'deliveryStatus' |
  'deliveryAttempts' |
  'reviewStatus'
>;

export interface ContactDeliveryRetrySummary {
  selected: number;
  sent: number;
  failed: number;
  skipped: number;
}

const MAX_EMBED_FIELD_LENGTH = 1024;
const MAX_EMBED_DESCRIPTION_LENGTH = 3500;
const MAX_ERROR_LENGTH = 500;

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function normalizeForEmbed(value: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : '-';
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return truncate(error.message.trim(), MAX_ERROR_LENGTH);
  }

  return 'Unknown delivery error';
}

function buildSubmissionUrl(config: AppConfig, submissionId: string): string | null {
  if (!config.APP_BASE_URL) {
    return null;
  }

  return `${config.APP_BASE_URL.replace(/\/$/, '')}/admin/contact-submissions/${submissionId}`;
}

function buildDiscordPayload(submission: ContactDeliveryCandidate, config: AppConfig): Record<string, unknown> {
  const fields: Array<Record<string, string | boolean>> = [
    {
      name: 'Name',
      value: truncate(normalizeForEmbed(submission.name), MAX_EMBED_FIELD_LENGTH),
      inline: true
    },
    {
      name: 'Email',
      value: truncate(normalizeForEmbed(submission.email), MAX_EMBED_FIELD_LENGTH),
      inline: true
    },
    {
      name: 'Subject',
      value: truncate(normalizeForEmbed(submission.subject), MAX_EMBED_FIELD_LENGTH),
      inline: false
    }
  ];

  const submissionUrl = buildSubmissionUrl(config, submission.id);
  if (submissionUrl) {
    fields.push({
      name: 'Submission',
      value: truncate(submissionUrl, MAX_EMBED_FIELD_LENGTH),
      inline: false
    });
  }

  return {
    username: 'mono256_my-profile-api',
    embeds: [
      {
        title: 'New contact submission',
        color: 3447003,
        description: truncate(normalizeForEmbed(submission.message), MAX_EMBED_DESCRIPTION_LENGTH),
        timestamp: submission.createdAt.toISOString(),
        fields
      }
    ]
  };
}

export function canSendContactNotifications(config: AppConfig): boolean {
  return config.CONTACT_NOTIFICATION_ENABLED && Boolean(config.DISCORD_WEBHOOK_URL);
}

async function postToDiscord(config: AppConfig, submission: ContactDeliveryCandidate): Promise<void> {
  const webhookUrl = config.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error('Discord webhook URL is not configured');
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(buildDiscordPayload(submission, config)),
    signal: AbortSignal.timeout(config.DISCORD_WEBHOOK_TIMEOUT_MS)
  });

  if (response.ok) {
    return;
  }

  const responseText = truncate((await response.text()).trim(), MAX_ERROR_LENGTH);
  throw new Error(`Discord webhook failed (${response.status}): ${responseText || 'empty response body'}`);
}

export async function deliverContactSubmission(
  prisma: PrismaClient,
  logger: ContactDeliveryLogger,
  config: AppConfig,
  submission: ContactDeliveryCandidate
): Promise<ContactDeliveryStatus> {
  if (!canSendContactNotifications(config)) {
    if (submission.deliveryStatus !== 'SKIPPED') {
      await prisma.contactSubmission.update({
        where: { id: submission.id },
        data: {
          deliveryStatus: 'SKIPPED',
          lastDeliveryError: 'Notification delivery disabled'
        }
      });
    }

    logger.info(
      {
        event: 'contact.delivery.skipped',
        submissionId: submission.id,
        reason: 'delivery_disabled'
      },
      'Contact submission delivery skipped'
    );

    return 'SKIPPED';
  }

  const attemptedAt = new Date();

  try {
    await postToDiscord(config, submission);

    await prisma.contactSubmission.update({
      where: { id: submission.id },
      data: {
        deliveryStatus: 'SENT',
        deliveryAttempts: {
          increment: 1
        },
        lastDeliveryAttemptAt: attemptedAt,
        deliveredAt: attemptedAt,
        lastDeliveryError: null
      }
    });

    logger.info(
      {
        event: 'contact.delivery.sent',
        submissionId: submission.id,
        attempt: submission.deliveryAttempts + 1
      },
      'Contact submission delivered to Discord'
    );

    return 'SENT';
  } catch (error) {
    const errorMessage = formatErrorMessage(error);

    try {
      await prisma.contactSubmission.update({
        where: { id: submission.id },
        data: {
          deliveryStatus: 'FAILED',
          deliveryAttempts: {
            increment: 1
          },
          lastDeliveryAttemptAt: attemptedAt,
          lastDeliveryError: errorMessage
        }
      });
    } catch (updateError) {
      logger.error(
        {
          err: updateError,
          submissionId: submission.id
        },
        'Failed to persist delivery failure state'
      );
    }

    logger.warn(
      {
        event: 'contact.delivery.failed',
        submissionId: submission.id,
        attempt: submission.deliveryAttempts + 1,
        error: errorMessage
      },
      'Contact submission delivery failed'
    );

    return 'FAILED';
  }
}

export async function retryPendingContactDeliveries(
  prisma: PrismaClient,
  logger: ContactDeliveryLogger,
  config: AppConfig
): Promise<ContactDeliveryRetrySummary> {
  const candidates = await prisma.contactSubmission.findMany({
    where: {
      deliveryStatus: {
        in: ['PENDING', 'FAILED']
      },
      deliveryAttempts: {
        lt: config.CONTACT_DELIVERY_MAX_ATTEMPTS
      },
      reviewStatus: {
        not: 'SPAM'
      }
    },
    orderBy: {
      createdAt: 'asc'
    },
    take: config.CONTACT_DELIVERY_BATCH_SIZE,
    select: {
      id: true,
      name: true,
      email: true,
      subject: true,
      message: true,
      createdAt: true,
      deliveryStatus: true,
      deliveryAttempts: true,
      reviewStatus: true
    }
  });

  const summary: ContactDeliveryRetrySummary = {
    selected: candidates.length,
    sent: 0,
    failed: 0,
    skipped: 0
  };

  for (const candidate of candidates) {
    const status = await deliverContactSubmission(prisma, logger, config, candidate);

    if (status === 'SENT') {
      summary.sent += 1;
      continue;
    }

    if (status === 'FAILED') {
      summary.failed += 1;
      continue;
    }

    summary.skipped += 1;
  }

  logger.info(
    {
      event: 'contact.delivery.retry.summary',
      ...summary
    },
    'Contact delivery retry batch finished'
  );

  return summary;
}
