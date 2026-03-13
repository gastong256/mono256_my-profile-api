import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/shared/utils/password';

const DEFAULT_EMAIL = 'admin@gastong256.dev';
const DEFAULT_NAME = 'Admin User';
const DEFAULT_PASSWORD = 'ChangeMe123!';

const prisma = new PrismaClient();

function resolveEnvValue(name: string, fallback?: string): string {
  const fromEnv = process.env[name];

  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }

  const filePath = process.env[`${name}_FILE`];

  if (filePath && filePath.trim().length > 0) {
    return fs.readFileSync(filePath, 'utf8').trim();
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`${name} is required`);
}

async function main(): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowProdSeed = process.env.ALLOW_PROD_SEED === 'true';

  if (isProduction && !allowProdSeed) {
    throw new Error('Refusing to seed in production without ALLOW_PROD_SEED=true');
  }

  const email = resolveEnvValue('SEED_USER_EMAIL', DEFAULT_EMAIL).toLowerCase();
  const name = resolveEnvValue('SEED_USER_NAME', DEFAULT_NAME);
  const password = resolveEnvValue('SEED_USER_PASSWORD', DEFAULT_PASSWORD);

  if (isProduction && password === DEFAULT_PASSWORD) {
    throw new Error('Refusing to use the default seed password in production');
  }

  if (password.length < 8) {
    throw new Error('SEED_USER_PASSWORD must be at least 8 characters');
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, passwordHash }
  });

  console.log(`Seeded user: ${email}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
