import fs from 'node:fs';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const DEFAULT_DATABASE_URL = 'postgresql://user:password@localhost:5432/mono256_my_profile';
const DEFAULT_TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const INSECURE_JWT_SECRETS = new Set([
  'change_me',
  'changeme',
  'secret',
  'jwt_secret',
  'your_jwt_secret'
]);
const SECRET_FILE_COMPAT_KEYS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'JWT_SECRET',
  'CONTACT_FINGERPRINT_SALT',
  'TURNSTILE_SECRET_KEY',
  'BOOTSTRAP_ADMIN_PASSWORD'
] as const;

function emptyStringToUndefined(value: unknown): unknown {
  if (typeof value === 'string' && value.trim().length === 0) {
    return undefined;
  }

  return value;
}

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
  DIRECT_URL: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  JWT_SECRET: z.string().min(8).default('change_me'),
  JWT_EXPIRES_IN: z.string().min(1).default('1d'),
  SWAGGER_ENABLED: z.string().optional(),
  RATE_LIMIT_ENABLED: z.string().optional(),
  TRUST_PROXY: z.string().optional(),
  CONTACT_MIN_INTERVAL_SECONDS: z.coerce.number().int().nonnegative().default(10),
  CONTACT_MAX_BY_IP_PER_HOUR: z.coerce.number().int().positive().default(30),
  CONTACT_MAX_BY_EMAIL_PER_HOUR: z.coerce.number().int().positive().default(8),
  CONTACT_DUPLICATE_WINDOW_MINUTES: z.coerce.number().int().positive().default(60),
  CONTACT_FINGERPRINT_SALT: z.preprocess(emptyStringToUndefined, z.string().min(16).optional()),
  CONTACT_REQUIRE_TURNSTILE: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  TURNSTILE_VERIFY_URL: z.string().url().default(DEFAULT_TURNSTILE_VERIFY_URL),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  AUTH_RATE_LIMIT_WINDOW: z.string().min(1).default('1 minute'),
  CONTACT_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  CONTACT_RATE_LIMIT_WINDOW: z.string().min(1).default('1 minute'),
  BOOTSTRAP_ADMIN_ENABLED: z.string().optional(),
  BOOTSTRAP_ADMIN_EMAIL: z.preprocess(emptyStringToUndefined, z.string().email().optional()),
  BOOTSTRAP_ADMIN_NAME: z.string().min(1).default('Admin User'),
  BOOTSTRAP_ADMIN_PASSWORD: z.preprocess(emptyStringToUndefined, z.string().min(8).optional()),
  BOOTSTRAP_ADMIN_UPDATE_EXISTING: z.string().optional()
});

export type AppConfig = Omit<
  z.infer<typeof rawEnvSchema>,
  'SWAGGER_ENABLED' | 'RATE_LIMIT_ENABLED' | 'TRUST_PROXY' | 'CONTACT_REQUIRE_TURNSTILE' |
  'BOOTSTRAP_ADMIN_ENABLED' | 'BOOTSTRAP_ADMIN_UPDATE_EXISTING'
> & {
  SWAGGER_ENABLED: boolean;
  RATE_LIMIT_ENABLED: boolean;
  TRUST_PROXY: boolean | number | string | string[];
  CONTACT_REQUIRE_TURNSTILE: boolean;
  CONTACT_FINGERPRINT_SALT: string;
  BOOTSTRAP_ADMIN_ENABLED: boolean;
  BOOTSTRAP_ADMIN_UPDATE_EXISTING: boolean;
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

function parseTrustProxy(
  value: string | undefined,
  fallback: boolean
): boolean | number | string | string[] {
  if (value === undefined) {
    return fallback;
  }

  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  if (/^\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }

  if (trimmed.includes(',')) {
    return trimmed
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return trimmed;
}

function applySecretFileOverrides(rawEnv: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const resolvedEnv: NodeJS.ProcessEnv = { ...rawEnv };

  for (const key of SECRET_FILE_COMPAT_KEYS) {
    const fileKey = `${key}_FILE`;
    const filePath = rawEnv[fileKey];

    if (!filePath || filePath.trim().length === 0) {
      continue;
    }

    resolvedEnv[key] = fs.readFileSync(filePath, 'utf8').trim();
  }

  return resolvedEnv;
}

export function loadEnv(rawEnv: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = rawEnvSchema.safeParse(applySecretFileOverrides(rawEnv));

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
  const trustProxy = parseTrustProxy(env.TRUST_PROXY, env.NODE_ENV === 'production');
  const contactRequireTurnstile = parseBoolean(
    env.CONTACT_REQUIRE_TURNSTILE,
    false,
    'CONTACT_REQUIRE_TURNSTILE'
  );
  const bootstrapAdminEnabled = parseBoolean(
    env.BOOTSTRAP_ADMIN_ENABLED,
    false,
    'BOOTSTRAP_ADMIN_ENABLED'
  );
  const bootstrapAdminUpdateExisting = parseBoolean(
    env.BOOTSTRAP_ADMIN_UPDATE_EXISTING,
    false,
    'BOOTSTRAP_ADMIN_UPDATE_EXISTING'
  );

  const config: AppConfig = {
    ...env,
    SWAGGER_ENABLED: swaggerEnabled,
    RATE_LIMIT_ENABLED: rateLimitEnabled,
    TRUST_PROXY: trustProxy,
    CONTACT_REQUIRE_TURNSTILE: contactRequireTurnstile,
    BOOTSTRAP_ADMIN_ENABLED: bootstrapAdminEnabled,
    BOOTSTRAP_ADMIN_UPDATE_EXISTING: bootstrapAdminUpdateExisting,
    CONTACT_FINGERPRINT_SALT: env.CONTACT_FINGERPRINT_SALT ?? env.JWT_SECRET
  };

  if (contactRequireTurnstile && !env.TURNSTILE_SECRET_KEY) {
    throw new Error('TURNSTILE_SECRET_KEY is required when CONTACT_REQUIRE_TURNSTILE=true');
  }

  if (bootstrapAdminEnabled) {
    if (!env.BOOTSTRAP_ADMIN_EMAIL || !env.BOOTSTRAP_ADMIN_PASSWORD) {
      throw new Error(
        'BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required when BOOTSTRAP_ADMIN_ENABLED=true'
      );
    }
  }

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

    if (!env.DIRECT_URL) {
      throw new Error('DIRECT_URL must be set to a direct database connection for migrations');
    }

    if (!env.CONTACT_FINGERPRINT_SALT || env.CONTACT_FINGERPRINT_SALT.length < 16) {
      throw new Error('CONTACT_FINGERPRINT_SALT must be set with at least 16 characters in production');
    }

    if (configuredOrigins.length === 0 || hasUnsafeOrigin) {
      throw new Error('CORS_ORIGIN must explicitly list trusted production origins');
    }

    if (swaggerEnabled) {
      throw new Error('SWAGGER_ENABLED must be false in production');
    }

    if (bootstrapAdminEnabled && env.BOOTSTRAP_ADMIN_PASSWORD && env.BOOTSTRAP_ADMIN_PASSWORD.length < 12) {
      throw new Error('BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters in production');
    }
  }

  return config;
}
