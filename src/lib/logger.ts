import type { FastifyServerOptions } from 'fastify';
import type { AppConfig } from '../config/env';

export function buildLoggerOptions(config: AppConfig): FastifyServerOptions['logger'] {
  const baseOptions = {
    level: config.LOG_LEVEL
  };

  if (config.NODE_ENV === 'development') {
    const hasPrettyTransport = (() => {
      try {
        require.resolve('pino-pretty');
        return true;
      } catch {
        return false;
      }
    })();

    if (!hasPrettyTransport) {
      return baseOptions;
    }

    return {
      ...baseOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }
    };
  }

  return baseOptions;
}
