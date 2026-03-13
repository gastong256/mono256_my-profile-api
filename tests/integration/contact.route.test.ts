import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../src/app/build-app';
import { testConfig } from '../helpers/test-config';

describe('Contact route', () => {
  const appPromise = buildApp(testConfig);

  beforeAll(async () => {
    const app = await appPromise;
    await app.ready();
  });

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it('POST /contact persists a submission', async () => {
    const app = await appPromise;
    const createMock = vi.fn().mockResolvedValue({
      id: 'd1360a00-0a90-4ef0-b4f7-8ce4c7950de4',
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Hello',
      createdAt: new Date()
    });

    (app.prisma.contactSubmission as unknown as { create: typeof createMock }).create = createMock;

    const response = await app.inject({
      method: 'POST',
      url: '/contact',
      payload: {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(response.json()).toEqual({
      success: true,
      message: 'Contact request received'
    });
  });

  it('POST /contact validates payload', async () => {
    const app = await appPromise;

    const response = await app.inject({
      method: 'POST',
      url: '/contact',
      payload: {
        name: 'A',
        email: 'invalid_email',
        message: ''
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: expect.any(String),
      message: expect.any(String)
    });
  });
});
