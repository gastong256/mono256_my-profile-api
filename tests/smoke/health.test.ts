import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app/build-app';
import { testConfig } from '../helpers/test-config';

describe('GET /health', () => {
  const appPromise = buildApp(testConfig);

  beforeAll(async () => {
    const app = await appPromise;
    await app.ready();
  });

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it('returns service health information', async () => {
    const app = await appPromise;

    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ok',
      service: 'mono256_my-profile-api'
    });
  });
});
