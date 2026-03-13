import { buildApp } from './app/build-app';
import { loadEnv } from './config/env';

async function startServer(): Promise<void> {
  const config = loadEnv();
  const app = await buildApp(config);
  let isShuttingDown = false;

  const shutdown = async (signal: string, exitCode: number): Promise<void> => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    app.log.info({ signal }, 'Shutdown signal received');

    try {
      await app.close();
      process.exit(exitCode);
    } catch (error) {
      app.log.error({ err: error }, 'Failed to shut down gracefully');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT', 0);
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM', 0);
  });

  process.on('unhandledRejection', (reason) => {
    app.log.error({ reason }, 'Unhandled promise rejection');
    void shutdown('UNHANDLED_REJECTION', 1);
  });

  process.on('uncaughtException', (error) => {
    app.log.fatal({ err: error }, 'Uncaught exception');
    void shutdown('UNCAUGHT_EXCEPTION', 1);
  });

  try {
    await app.listen({
      host: config.HOST,
      port: config.PORT
    });

    app.log.info(
      {
        host: config.HOST,
        port: config.PORT,
        env: config.NODE_ENV
      },
      'Server started'
    );
  } catch (error) {
    app.log.error({ err: error }, 'Server failed to start');
    process.exit(1);
  }
}

void startServer();
