import { loadEnv } from '../config/env';
import { prisma } from '../lib/prisma';
import { retryPendingContactDeliveries } from '../modules/contact/contact.delivery';

const logger = {
  info(...args: unknown[]): void {
    console.info(...args);
  },
  warn(...args: unknown[]): void {
    console.warn(...args);
  },
  error(...args: unknown[]): void {
    console.error(...args);
  }
};

async function main(): Promise<void> {
  const config = loadEnv();

  await prisma.$connect();

  const summary = await retryPendingContactDeliveries(prisma, logger, config);

  console.info('Contact delivery retry completed', summary);

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('Contact delivery retry failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
