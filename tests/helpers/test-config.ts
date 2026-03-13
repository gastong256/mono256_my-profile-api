import type { AppConfig } from '../../src/config/env';

export const testConfig: AppConfig = {
  NODE_ENV: 'test',
  PORT: 4000,
  HOST: '127.0.0.1',
  APP_BASE_URL: 'http://127.0.0.1:4000',
  LOG_LEVEL: 'silent',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/mono256_my_profile',
  CORS_ORIGIN: 'http://localhost:3000',
  JWT_SECRET: 'test_secret_key_which_is_long_enough',
  JWT_EXPIRES_IN: '1d',
  SWAGGER_ENABLED: false,
  RATE_LIMIT_ENABLED: false,
  AUTH_RATE_LIMIT_MAX: 5,
  AUTH_RATE_LIMIT_WINDOW: '1 minute',
  CONTACT_RATE_LIMIT_MAX: 10,
  CONTACT_RATE_LIMIT_WINDOW: '1 minute'
};
