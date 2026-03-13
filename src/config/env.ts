import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const DEFAULT_DATABASE_URL = 'postgresql://user:password@localhost:5432/mono256_my_profile';
const INSECURE_JWT_SECRETS = new Set([
  'change_me',
  'changeme',
  'secret',
  'jwt_secret',
  'your_jwt_secret'
]);

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().min(1).default('0.0.0.0'),
  APP_BASE_URL: z.string().url().optional(),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  DATABASE_URL: z
    .string()
    .min(1)
    .default(DEFAULT_DATABASE_URL),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  JWT_SECRET: z.string().min(8).default('change_me'),
  JWT_EXPIRES_IN: z.string().min(1).default('1d'),
  SWAGGER_ENABLED: z.string().optional(),
  RATE_LIMIT_ENABLED: z.string().optional(),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  AUTH_RATE_LIMIT_WINDOW: z.string().min(1).default('1 minute'),
  CONTACT_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  CONTACT_RATE_LIMIT_WINDOW: z.string().min(1).default('1 minute')
});

export type AppConfig = Omit<
  z.infer<typeof rawEnvSchema>,
  'SWAGGER_ENABLED' | 'RATE_LIMIT_ENABLED'
> & {
  SWAGGER_ENABLED: boolean;
  RATE_LIMIT_ENABLED: boolean;
};

function parseBoolean(value: string | undefined, fallback: boolean, envName: string): boolean {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  throw new Error(`Invalid ${envName} value: ${value}`);
}

export function loadEnv(rawEnv: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = rawEnvSchema.safeParse(rawEnv);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  const env = parsed.data;
  const swaggerEnabled = parseBoolean(
    env.SWAGGER_ENABLED,
    env.NODE_ENV !== 'production',
    'SWAGGER_ENABLED'
  );
  const rateLimitEnabled = parseBoolean(env.RATE_LIMIT_ENABLED, true, 'RATE_LIMIT_ENABLED');

  const config: AppConfig = {
    ...env,
    SWAGGER_ENABLED: swaggerEnabled,
    RATE_LIMIT_ENABLED: rateLimitEnabled
  };

  if (env.NODE_ENV === 'production') {
    const normalizedJwtSecret = env.JWT_SECRET.trim().toLowerCase();
    const configuredOrigins = env.CORS_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    const hasUnsafeOrigin = configuredOrigins.some((origin) => {
      return origin === '*' || origin.includes('localhost') || origin.includes('127.0.0.1');
    });

    if (env.JWT_SECRET.length < 32 || INSECURE_JWT_SECRETS.has(normalizedJwtSecret)) {
      throw new Error('JWT_SECRET must be at least 32 characters and not use common defaults');
    }

    if (env.DATABASE_URL === DEFAULT_DATABASE_URL) {
      throw new Error('DATABASE_URL must be set to a production database');
    }

    if (configuredOrigins.length === 0 || hasUnsafeOrigin) {
      throw new Error('CORS_ORIGIN must explicitly list trusted production origins');
    }

    if (swaggerEnabled) {
      throw new Error('SWAGGER_ENABLED must be false in production');
    }
  }

  return config;
}
