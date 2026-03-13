import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../src/config/env';

describe('loadEnv', () => {
  it('parses trust proxy as number', () => {
    const config = loadEnv({
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://user:password@localhost:5432/mono256_my_profile',
      DIRECT_URL: 'postgresql://user:password@localhost:5432/mono256_my_profile',
      CORS_ORIGIN: 'http://localhost:3000',
      JWT_SECRET: 'test_secret_key_which_is_long_enough',
      TRUST_PROXY: '2'
    });

    expect(config.TRUST_PROXY).toBe(2);
  });

  it('requires DIRECT_URL in production', () => {
    expect(() => {
      loadEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:password@db.example.com:5432/prod',
        CORS_ORIGIN: 'https://app.example.com',
        JWT_SECRET: 'very_long_and_secure_jwt_secret_for_production_123',
        SWAGGER_ENABLED: 'false'
      });
    }).toThrow('DIRECT_URL must be set to a direct database connection for migrations');
  });

  it('requires turnstile secret when captcha enforcement is enabled', () => {
    expect(() => {
      loadEnv({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://user:password@localhost:5432/mono256_my_profile',
        DIRECT_URL: 'postgresql://user:password@localhost:5432/mono256_my_profile',
        CORS_ORIGIN: 'http://localhost:3000',
        JWT_SECRET: 'test_secret_key_which_is_long_enough',
        CONTACT_REQUIRE_TURNSTILE: 'true'
      });
    }).toThrow('TURNSTILE_SECRET_KEY is required when CONTACT_REQUIRE_TURNSTILE=true');
  });
});
