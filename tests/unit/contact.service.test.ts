import type { FastifyInstance } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { submitContactRequest } from '../../src/modules/contact/contact.service';

describe('submitContactRequest', () => {
  it('persists a contact submission and returns success payload', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'contact-id' });
    const info = vi.fn();

    const fastify = {
      prisma: {
        contactSubmission: {
          create
        }
      },
      log: {
        info
      },
      httpErrors: {
        serviceUnavailable: (message: string) => {
          const error = new Error(message) as Error & { statusCode: number };
          error.statusCode = 503;
          return error;
        }
      }
    } as unknown as FastifyInstance;

    const payload = {
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Hello'
    };

    const result = await submitContactRequest(fastify, payload);

    expect(create).toHaveBeenCalledWith({
      data: {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello'
      }
    });

    expect(info).toHaveBeenCalled();

    expect(result).toEqual({
      success: true,
      message: 'Contact request received'
    });
  });
});
