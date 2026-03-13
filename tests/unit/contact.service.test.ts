import type { FastifyInstance } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { submitContactRequest } from '../../src/modules/contact/contact.service';

describe('submitContactRequest', () => {
  it('persists a contact submission and returns success payload', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'contact-id' });
    const count = vi.fn().mockResolvedValue(0);
    const findFirst = vi.fn().mockResolvedValue(null);
    const info = vi.fn();
    const warn = vi.fn();

    const fastify = {
      prisma: {
        contactSubmission: {
          create,
          count,
          findFirst
        }
      },
      log: {
        info,
        warn
      },
      httpErrors: {
        serviceUnavailable: (message: string) => {
          const error = new Error(message) as Error & { statusCode: number };
          error.statusCode = 503;
          return error;
        },
        tooManyRequests: (message: string) => {
          const error = new Error(message) as Error & { statusCode: number };
          error.statusCode = 429;
          return error;
        },
        badRequest: (message: string) => {
          const error = new Error(message) as Error & { statusCode: number };
          error.statusCode = 400;
          return error;
        }
      },
      config: {
        CONTACT_REQUIRE_TURNSTILE: false,
        CONTACT_DUPLICATE_WINDOW_MINUTES: 60,
        CONTACT_MIN_INTERVAL_SECONDS: 10,
        CONTACT_MAX_BY_IP_PER_HOUR: 30,
        CONTACT_MAX_BY_EMAIL_PER_HOUR: 8,
        CONTACT_FINGERPRINT_SALT: 'test_contact_fingerprint_salt',
        TURNSTILE_SECRET_KEY: '',
        TURNSTILE_VERIFY_URL: 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
      }
    } as unknown as FastifyInstance;

    const payload = {
      name: 'John Doe',
      email: 'John@Example.com',
      message: 'Hello'
    };

    const result = await submitContactRequest(fastify, payload, {
      ip: '127.0.0.1'
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello',
        fingerprint: expect.any(String),
        ipHash: expect.any(String),
        userAgent: null
      }
    });

    expect(info).toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(count).toHaveBeenCalledTimes(2);
    expect(findFirst).toHaveBeenCalledTimes(2);

    expect(result).toEqual({
      success: true,
      message: 'Contact request received'
    });
  });
});
