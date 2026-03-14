import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { errorResponseSchema } from '../../shared/schemas/error.schema';
import {
  contactSubmissionDetailResponseSchema,
  contactSubmissionParamsSchema,
  listContactSubmissionsQuerySchema,
  listContactSubmissionsResponseSchema,
  updateContactSubmissionBodySchema,
  updateContactSubmissionResponseSchema
} from './admin.schema';
import {
  getContactSubmissionById,
  listContactSubmissions,
  updateContactSubmissionStatus
} from './admin.service';

export const adminRoute: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get('/admin/contact-submissions', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Admin'],
      summary: 'List contact submissions',
      security: [{ bearerAuth: [] }],
      querystring: listContactSubmissionsQuerySchema,
      response: {
        200: listContactSubmissionsResponseSchema,
        401: errorResponseSchema,
        503: errorResponseSchema
      }
    }
  }, async (request) => {
    const query = listContactSubmissionsQuerySchema.parse(request.query);
    return listContactSubmissions(fastify, query);
  });

  app.get('/admin/contact-submissions/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Admin'],
      summary: 'Get contact submission details',
      security: [{ bearerAuth: [] }],
      params: contactSubmissionParamsSchema,
      response: {
        200: contactSubmissionDetailResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
        503: errorResponseSchema
      }
    }
  }, async (request) => {
    const params = contactSubmissionParamsSchema.parse(request.params);
    return getContactSubmissionById(fastify, params);
  });

  app.patch('/admin/contact-submissions/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Admin'],
      summary: 'Update contact submission review status',
      security: [{ bearerAuth: [] }],
      params: contactSubmissionParamsSchema,
      body: updateContactSubmissionBodySchema,
      response: {
        200: updateContactSubmissionResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
        503: errorResponseSchema
      }
    }
  }, async (request) => {
    const params = contactSubmissionParamsSchema.parse(request.params);
    const body = updateContactSubmissionBodySchema.parse(request.body);

    return updateContactSubmissionStatus(fastify, params, body);
  });
};
