import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app/build-app';
import { testConfig } from '../helpers/test-config';

describe('Admin contact submission routes', () => {
  const appPromise = buildApp(testConfig);

  beforeAll(async () => {
    const app = await appPromise;
    await app.ready();
  });

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it('GET /admin/contact-submissions requires authentication', async () => {
    const app = await appPromise;

    const response = await app.inject({
      method: 'GET',
      url: '/admin/contact-submissions'
    });

    expect(response.statusCode).toBe(401);
  });

  it('GET /admin/contact-submissions returns paginated submissions', async () => {
    const app = await appPromise;
    const now = new Date('2026-03-13T00:00:00.000Z');

    (app.prisma as unknown as {
      $transaction: (...args: unknown[]) => Promise<unknown[]>;
    }).$transaction = async () => ([
      1,
      [
        {
          id: '1735c885-c42c-4cf6-92ed-f9ce32d45e85',
          name: 'John Doe',
          subject: 'Project inquiry',
          email: 'john@example.com',
          message: 'Hello from admin route test',
          reviewStatus: 'NEW',
          deliveryStatus: 'SENT',
          deliveryAttempts: 1,
          createdAt: now,
          updatedAt: now,
          lastDeliveryAttemptAt: now,
          deliveredAt: now
        }
      ]
    ]);

    const token = app.jwt.sign({
      sub: '6f00a8fc-6a9b-4e36-b66b-a6ed84eb53e8',
      email: 'admin@gastong256.dev',
      name: 'Admin User'
    });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/contact-submissions?page=1&pageSize=20',
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      items: [
        {
          id: '1735c885-c42c-4cf6-92ed-f9ce32d45e85',
          name: 'John Doe',
          subject: 'Project inquiry',
          email: 'john@example.com',
          messagePreview: 'Hello from admin route test',
          reviewStatus: 'NEW',
          deliveryStatus: 'SENT',
          deliveryAttempts: 1,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          lastDeliveryAttemptAt: now.toISOString(),
          deliveredAt: now.toISOString()
        }
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1
      }
    });
  });

  it('GET /admin/contact-submissions/:id returns submission details', async () => {
    const app = await appPromise;
    const now = new Date('2026-03-13T00:00:00.000Z');

    (app.prisma.contactSubmission as unknown as {
      findUniqueOrThrow: (...args: unknown[]) => Promise<unknown>;
    }).findUniqueOrThrow = async () => ({
      id: '1735c885-c42c-4cf6-92ed-f9ce32d45e85',
      name: 'John Doe',
      subject: 'Project inquiry',
      email: 'john@example.com',
      message: 'Hello from details endpoint',
      reviewStatus: 'IN_REVIEW',
      deliveryStatus: 'FAILED',
      deliveryAttempts: 2,
      lastDeliveryAttemptAt: now,
      deliveredAt: null,
      lastDeliveryError: 'Discord webhook failed',
      createdAt: now,
      updatedAt: now
    });

    const token = app.jwt.sign({
      sub: '6f00a8fc-6a9b-4e36-b66b-a6ed84eb53e8',
      email: 'admin@gastong256.dev',
      name: 'Admin User'
    });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/contact-submissions/1735c885-c42c-4cf6-92ed-f9ce32d45e85',
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      submission: {
        id: '1735c885-c42c-4cf6-92ed-f9ce32d45e85',
        name: 'John Doe',
        subject: 'Project inquiry',
        email: 'john@example.com',
        message: 'Hello from details endpoint',
        reviewStatus: 'IN_REVIEW',
        deliveryStatus: 'FAILED',
        deliveryAttempts: 2,
        lastDeliveryAttemptAt: now.toISOString(),
        deliveredAt: null,
        lastDeliveryError: 'Discord webhook failed',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }
    });
  });

  it('PATCH /admin/contact-submissions/:id updates review status', async () => {
    const app = await appPromise;
    const now = new Date('2026-03-13T00:00:00.000Z');

    (app.prisma.contactSubmission as unknown as {
      update: (...args: unknown[]) => Promise<unknown>;
    }).update = async () => ({
      id: '1735c885-c42c-4cf6-92ed-f9ce32d45e85',
      reviewStatus: 'RESOLVED',
      updatedAt: now
    });

    const token = app.jwt.sign({
      sub: '6f00a8fc-6a9b-4e36-b66b-a6ed84eb53e8',
      email: 'admin@gastong256.dev',
      name: 'Admin User'
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/admin/contact-submissions/1735c885-c42c-4cf6-92ed-f9ce32d45e85',
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: {
        reviewStatus: 'RESOLVED'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      submission: {
        id: '1735c885-c42c-4cf6-92ed-f9ce32d45e85',
        reviewStatus: 'RESOLVED',
        updatedAt: now.toISOString()
      }
    });
  });
});
