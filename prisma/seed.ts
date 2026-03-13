import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/shared/utils/password';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = (process.env.SEED_USER_EMAIL ?? 'admin@gastong256.dev').toLowerCase();
  const name = process.env.SEED_USER_NAME ?? 'Admin User';
  const password = process.env.SEED_USER_PASSWORD ?? 'ChangeMe123!';

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
