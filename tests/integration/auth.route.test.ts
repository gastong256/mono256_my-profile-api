import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app/build-app';
import { hashPassword } from '../../src/shared/utils/password';
import { testConfig } from '../helpers/test-config';

describe('Auth routes', () => {
  const appPromise = buildApp(testConfig);

  beforeAll(async () => {
    const app = await appPromise;
    await app.ready();
  });

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it('POST /auth/login returns token for valid credentials', async () => {
    const app = await appPromise;
    const passwordHash = await hashPassword('ChangeMe123!');
    const findUniqueMock = async () => {
      return {
        id: '6f00a8fc-6a9b-4e36-b66b-a6ed84eb53e8',
        email: 'admin@gastong256.dev',
        name: 'Admin User',
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    };

    (app.prisma.user as unknown as { findUnique: typeof findUniqueMock }).findUnique = findUniqueMock;

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'admin@gastong256.dev',
        password: 'ChangeMe123!'
      }
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();

    expect(body.user).toEqual({
      id: '6f00a8fc-6a9b-4e36-b66b-a6ed84eb53e8',
      email: 'admin@gastong256.dev',
      name: 'Admin User'
    });
    expect(body.tokenType).toBe('Bearer');
    expect(body.accessToken).toEqual(expect.any(String));
  });

  it('POST /auth/login rejects invalid credentials', async () => {
    const app = await appPromise;
    const passwordHash = await hashPassword('DifferentPassword123!');

    (app.prisma.user as unknown as {
      findUnique: (...args: unknown[]) => Promise<unknown>;
    }).findUnique = async () => {
      return {
        id: '6f00a8fc-6a9b-4e36-b66b-a6ed84eb53e8',
        email: 'admin@gastong256.dev',
        name: 'Admin User',
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    };

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'admin@gastong256.dev',
        password: 'ChangeMe123!'
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      message: 'Invalid credentials'
    });
  });

  it('GET /auth/me returns authenticated user', async () => {
    const app = await appPromise;

    (app.prisma.user as unknown as {
      findUnique: (...args: unknown[]) => Promise<unknown>;
    }).findUnique = async () => {
      return {
        id: '6f00a8fc-6a9b-4e36-b66b-a6ed84eb53e8',
        email: 'admin@gastong256.dev',
        name: 'Admin User'
      };
    };

    const token = app.jwt.sign({
      sub: '6f00a8fc-6a9b-4e36-b66b-a6ed84eb53e8',
      email: 'admin@gastong256.dev',
      name: 'Admin User'
    });

    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      user: {
        id: '6f00a8fc-6a9b-4e36-b66b-a6ed84eb53e8',
        email: 'admin@gastong256.dev',
        name: 'Admin User'
      }
    });
  });
});
