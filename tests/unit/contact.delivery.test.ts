import type { PrismaClient } from '@prisma/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../../src/config/env';
import {
  canSendContactNotifications,
  deliverContactSubmission,
  retryPendingContactDeliveries
} from '../../src/modules/contact/contact.delivery';

const baseConfig: AppConfig = {
  NODE_ENV: 'test',
  PORT: 4000,
  HOST: '127.0.0.1',
  APP_BASE_URL: 'http://127.0.0.1:4000',
  LOG_LEVEL: 'silent',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/mono256_my_profile',
  DIRECT_URL: 'postgresql://user:password@localhost:5432/mono256_my_profile',
  CORS_ORIGIN: 'http://localhost:3000',
  JWT_SECRET: 'test_secret_key_which_is_long_enough',
  JWT_EXPIRES_IN: '1d',
  SWAGGER_ENABLED: false,
  RATE_LIMIT_ENABLED: false,
  TRUST_PROXY: false,
  CONTACT_MIN_INTERVAL_SECONDS: 10,
  CONTACT_MAX_BY_IP_PER_HOUR: 30,
  CONTACT_MAX_BY_EMAIL_PER_HOUR: 8,
  CONTACT_DUPLICATE_WINDOW_MINUTES: 60,
  CONTACT_FINGERPRINT_SALT: 'test_contact_fingerprint_salt',
  CONTACT_REQUIRE_TURNSTILE: false,
  TURNSTILE_SECRET_KEY: undefined,
  TURNSTILE_VERIFY_URL: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  CONTACT_NOTIFICATION_ENABLED: false,
  DISCORD_WEBHOOK_URL: undefined,
  DISCORD_WEBHOOK_TIMEOUT_MS: 5000,
  CONTACT_DELIVERY_MAX_ATTEMPTS: 5,
  CONTACT_DELIVERY_BATCH_SIZE: 50,
  AUTH_RATE_LIMIT_MAX: 5,
  AUTH_RATE_LIMIT_WINDOW: '1 minute',
  CONTACT_RATE_LIMIT_MAX: 10,
  CONTACT_RATE_LIMIT_WINDOW: '1 minute',
  BOOTSTRAP_ADMIN_ENABLED: false,
  BOOTSTRAP_ADMIN_EMAIL: undefined,
  BOOTSTRAP_ADMIN_NAME: 'Admin User',
  BOOTSTRAP_ADMIN_PASSWORD: undefined,
  BOOTSTRAP_ADMIN_UPDATE_EXISTING: false
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('contact delivery', () => {
  it('detects if contact notification delivery is enabled', () => {
    expect(canSendContactNotifications(baseConfig)).toBe(false);

    expect(canSendContactNotifications({
      ...baseConfig,
      CONTACT_NOTIFICATION_ENABLED: true,
      DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test'
    })).toBe(true);
  });

  it('marks submission as skipped when delivery is disabled', async () => {
    const update = vi.fn().mockResolvedValue({});
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    const prisma = {
      contactSubmission: {
        update
      }
    } as unknown as PrismaClient;

    const status = await deliverContactSubmission(prisma, logger, baseConfig, {
      id: '1735c885-c42c-4cf6-92ed-f9ce32d45e85',
      name: 'John Doe',
      subject: 'Project inquiry',
      email: 'john@example.com',
      message: 'Hello',
      createdAt: new Date('2026-03-13T00:00:00.000Z'),
      deliveryStatus: 'PENDING',
      deliveryAttempts: 0,
      reviewStatus: 'NEW'
    });

    expect(status).toBe('SKIPPED');
    expect(update).toHaveBeenCalledWith({
      where: { id: '1735c885-c42c-4cf6-92ed-f9ce32d45e85' },
      data: {
        deliveryStatus: 'SKIPPED',
        lastDeliveryError: 'Notification delivery disabled'
      }
    });
  });

  it('marks submission as sent on successful webhook post', async () => {
    const update = vi.fn().mockResolvedValue({});
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    const prisma = {
      contactSubmission: {
        update
      }
    } as unknown as PrismaClient;

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 200 })));

    const status = await deliverContactSubmission(prisma, logger, {
      ...baseConfig,
      CONTACT_NOTIFICATION_ENABLED: true,
      DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test'
    }, {
      id: '1735c885-c42c-4cf6-92ed-f9ce32d45e85',
      name: 'John Doe',
      subject: 'Project inquiry',
      email: 'john@example.com',
      message: 'Hello',
      createdAt: new Date('2026-03-13T00:00:00.000Z'),
      deliveryStatus: 'PENDING',
      deliveryAttempts: 0,
      reviewStatus: 'NEW'
    });

    expect(status).toBe('SENT');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: '1735c885-c42c-4cf6-92ed-f9ce32d45e85' },
      data: expect.objectContaining({
        deliveryStatus: 'SENT',
        lastDeliveryError: null
      })
    }));
  });

  it('retries pending submissions in a batch', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: '1735c885-c42c-4cf6-92ed-f9ce32d45e85',
        name: 'John Doe',
        subject: 'Project inquiry',
        email: 'john@example.com',
        message: 'Hello',
        createdAt: new Date('2026-03-13T00:00:00.000Z'),
        deliveryStatus: 'PENDING',
        deliveryAttempts: 0,
        reviewStatus: 'NEW'
      }
    ]);
    const update = vi.fn().mockResolvedValue({});

    const prisma = {
      contactSubmission: {
        findMany,
        update
      }
    } as unknown as PrismaClient;

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 200 })));

    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    const summary = await retryPendingContactDeliveries(prisma, logger, {
      ...baseConfig,
      CONTACT_NOTIFICATION_ENABLED: true,
      DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test'
    });

    expect(summary).toEqual({
      selected: 1,
      sent: 1,
      failed: 0,
      skipped: 0
    });
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
  });
});
