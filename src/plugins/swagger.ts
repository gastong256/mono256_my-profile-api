import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fp from 'fastify-plugin';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

export const swaggerPlugin = fp(async (fastify) => {
  if (!fastify.config.SWAGGER_ENABLED) {
    fastify.log.info('Swagger UI and OpenAPI are disabled');
    return;
  }

  const serverUrl = fastify.config.APP_BASE_URL ?? `http://${fastify.config.HOST}:${fastify.config.PORT}`;

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'mono256_my-profile-api',
        version: '0.1.0',
        description: 'Production-oriented API foundation for mono256_my-profile.'
      },
      servers: [
        {
          url: serverUrl
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    },
    transform: jsonSchemaTransform
  });

  if (fastify.config.SWAGGER_ENABLED) {
    await fastify.register(swaggerUi, { routePrefix: '/docs' });

    fastify.get('/openapi.json', async () => fastify.swagger());
  }
}, { name: 'swagger-plugin' });
