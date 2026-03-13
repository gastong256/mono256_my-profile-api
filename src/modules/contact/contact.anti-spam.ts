import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { ContactBody } from './contact.schema';

type ContactRequestContext = {
  ip: string;
  userAgent?: string;
};

type SpamProtectionResult = {
  dropAsDuplicate: boolean;
  fingerprint: string;
  ipHash: string;
  userAgent: string | null;
};

function hashValue(value: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${value}`).digest('hex');
}

function normalizeMessage(message: string): string {
  return message.trim().replace(/\s+/g, ' ').toLowerCase();
}

async function verifyTurnstileToken(
  fastify: FastifyInstance,
  token: string,
  ip: string
): Promise<void> {
  const secret = fastify.config.TURNSTILE_SECRET_KEY;

  if (!secret) {
    throw fastify.httpErrors.serviceUnavailable('Captcha verification is not configured');
  }

  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: ip
  });

  let response: Response;

  try {
    response = await fetch(fastify.config.TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body,
      signal: AbortSignal.timeout(5000)
    });
  } catch (error) {
    fastify.log.error({ err: error }, 'Turnstile verification request failed');
    throw fastify.httpErrors.serviceUnavailable('Captcha verification unavailable');
  }

  if (!response.ok) {
    fastify.log.warn({ statusCode: response.status }, 'Turnstile verification returned non-success status');
    throw fastify.httpErrors.badRequest('Invalid captcha token');
  }

  const data = await response.json() as { success?: boolean; ['error-codes']?: string[] };

  if (!data.success) {
    fastify.log.warn({ errors: data['error-codes'] }, 'Turnstile verification rejected token');
    throw fastify.httpErrors.badRequest('Invalid captcha token');
  }
}

export async function runContactSpamProtection(
  fastify: FastifyInstance,
  payload: ContactBody,
  context: ContactRequestContext
): Promise<SpamProtectionResult> {
  if (fastify.config.CONTACT_REQUIRE_TURNSTILE) {
    if (!payload.captchaToken) {
      throw fastify.httpErrors.badRequest('captchaToken is required');
    }

    await verifyTurnstileToken(fastify, payload.captchaToken, context.ip);
  }

  const now = Date.now();
  const oneHourAgo = new Date(now - (60 * 60 * 1000));
  const duplicateWindowStart = new Date(
    now - (fastify.config.CONTACT_DUPLICATE_WINDOW_MINUTES * 60 * 1000)
  );
  const minIntervalStart = new Date(
    now - (fastify.config.CONTACT_MIN_INTERVAL_SECONDS * 1000)
  );

  const normalizedEmail = payload.email.toLowerCase();
  const normalizedMessage = normalizeMessage(payload.message);
  const fingerprint = hashValue(`${normalizedEmail}:${normalizedMessage}`, fastify.config.CONTACT_FINGERPRINT_SALT);
  const ipHash = hashValue(context.ip, fastify.config.CONTACT_FINGERPRINT_SALT);

  const [countByIp, countByEmail, duplicateInWindow, recentByIp] = await Promise.all([
    fastify.prisma.contactSubmission.count({
      where: {
        ipHash,
        createdAt: {
          gte: oneHourAgo
        }
      }
    }),
    fastify.prisma.contactSubmission.count({
      where: {
        email: normalizedEmail,
        createdAt: {
          gte: oneHourAgo
        }
      }
    }),
    fastify.prisma.contactSubmission.findFirst({
      where: {
        fingerprint,
        createdAt: {
          gte: duplicateWindowStart
        }
      },
      select: {
        id: true
      }
    }),
    fastify.prisma.contactSubmission.findFirst({
      where: {
        ipHash,
        createdAt: {
          gte: minIntervalStart
        }
      },
      select: {
        id: true
      }
    })
  ]);

  if (countByIp >= fastify.config.CONTACT_MAX_BY_IP_PER_HOUR) {
    throw fastify.httpErrors.tooManyRequests('Too many contact requests from this IP');
  }

  if (countByEmail >= fastify.config.CONTACT_MAX_BY_EMAIL_PER_HOUR) {
    throw fastify.httpErrors.tooManyRequests('Too many contact requests for this email');
  }

  if (recentByIp) {
    throw fastify.httpErrors.tooManyRequests('Please wait before sending another request');
  }

  return {
    dropAsDuplicate: Boolean(duplicateInWindow),
    fingerprint,
    ipHash,
    userAgent: context.userAgent ? context.userAgent.slice(0, 512) : null
  };
}
