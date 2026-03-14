import type { FastifyInstance } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { runContactSpamProtection } from '../../src/modules/contact/contact.anti-spam';

function buildFastify(overrides?: {
  countImpl?: (args: unknown) => Promise<number>;
  findFirstImpl?: (args: unknown) => Promise<{ id: string } | null>;
}): FastifyInstance {
  const count = vi.fn(overrides?.countImpl ?? (async () => 0));
  const findFirst = vi.fn(overrides?.findFirstImpl ?? (async () => null));

  return {
    prisma: {
      contactSubmission: {
        count,
        findFirst
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
    },
    httpErrors: {
      tooManyRequests: (message: string) => {
        const error = new Error(message) as Error & { statusCode: number };
        error.statusCode = 429;
        return error;
      },
      badRequest: (message: string) => {
        const error = new Error(message) as Error & { statusCode: number };
        error.statusCode = 400;
        return error;
      },
      serviceUnavailable: (message: string) => {
        const error = new Error(message) as Error & { statusCode: number };
        error.statusCode = 503;
        return error;
      }
    },
    log: {
      warn: vi.fn(),
      error: vi.fn()
    }
  } as unknown as FastifyInstance;
}

describe('runContactSpamProtection', () => {
  it('returns dropAsDuplicate when same fingerprint appears inside duplicate window', async () => {
    let findFirstCall = 0;
    const fastify = buildFastify({
      findFirstImpl: async () => {
        findFirstCall += 1;

        if (findFirstCall === 1) {
          return { id: 'duplicate' };
        }

        return null;
      }
    });

    const result = await runContactSpamProtection(
      fastify,
      {
        name: 'John Doe',
        subject: 'Project inquiry',
        email: 'john@example.com',
        message: 'Hello'
      },
      {
        ip: '127.0.0.1'
      }
    );

    expect(result.dropAsDuplicate).toBe(true);
    expect(result.fingerprint).toEqual(expect.any(String));
    expect(result.ipHash).toEqual(expect.any(String));
  });

  it('throws tooManyRequests when IP hourly limit is exceeded', async () => {
    let countCall = 0;

    const fastify = buildFastify({
      countImpl: async () => {
        countCall += 1;

        if (countCall === 1) {
          return 30;
        }

        return 0;
      }
    });

    await expect(() => {
      return runContactSpamProtection(
        fastify,
        {
          name: 'John Doe',
          subject: 'Project inquiry',
          email: 'john@example.com',
          message: 'Hello'
        },
        {
          ip: '127.0.0.1'
        }
      );
    }).rejects.toMatchObject({
      statusCode: 429,
      message: 'Too many contact requests from this IP'
    });
  });
});
