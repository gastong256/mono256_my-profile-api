import type { FastifyServerOptions } from 'fastify';
import type { AppConfig } from '../config/env';

export function buildLoggerOptions(config: AppConfig): FastifyServerOptions['logger'] {
  const baseOptions = {
    level: config.LOG_LEVEL
  };

  if (config.NODE_ENV === 'development') {
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
