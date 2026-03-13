import Fastify from 'fastify';
import type { FastifyError } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { AppConfig } from '../config/env';
import { buildLoggerOptions } from '../lib/logger';
import { registerPlugins } from './register-plugins';
import { registerRoutes } from './register-routes';

export async function buildApp(config: AppConfig) {
  const app = Fastify({
    logger: buildLoggerOptions(config)
  });

  app.decorate('config', config);

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((error, request, reply) => {
    const typedError = error as FastifyError;
    const statusCode = typedError.statusCode ?? 500;
    const isServerError = statusCode >= 500;
    const errorCode = isServerError ? 'INTERNAL_SERVER_ERROR' : (typedError.code ?? 'BAD_REQUEST');

    if (isServerError) {
      request.log.error({ err: error, code: errorCode, statusCode }, 'Request failed');
    } else {
      request.log.warn({ err: error, code: errorCode, statusCode }, 'Request failed');
    }

    const message = isServerError ? 'Internal server error' : typedError.message;
    return reply.status(statusCode).send({ code: errorCode, message });
  });

  await registerPlugins(app);
  await registerRoutes(app);

  return app;
}
