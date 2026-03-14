import { z } from 'zod';

export const contactReviewStatusSchema = z.enum(['NEW', 'IN_REVIEW', 'RESOLVED', 'SPAM']);
export const contactDeliveryStatusSchema = z.enum(['PENDING', 'SENT', 'FAILED', 'SKIPPED']);

export const listContactSubmissionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  reviewStatus: contactReviewStatusSchema.optional(),
  deliveryStatus: contactDeliveryStatusSchema.optional()
});

export const contactSubmissionParamsSchema = z.object({
  id: z.string().uuid()
});

export const updateContactSubmissionBodySchema = z.object({
  reviewStatus: contactReviewStatusSchema
});

const contactSubmissionSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  messagePreview: z.string(),
  reviewStatus: contactReviewStatusSchema,
  deliveryStatus: contactDeliveryStatusSchema,
  deliveryAttempts: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastDeliveryAttemptAt: z.string().datetime().nullable(),
  deliveredAt: z.string().datetime().nullable()
});

export const listContactSubmissionsResponseSchema = z.object({
  items: z.array(contactSubmissionSummarySchema),
  pagination: z.object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative()
  })
});

export const contactSubmissionDetailResponseSchema = z.object({
  submission: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    message: z.string(),
    reviewStatus: contactReviewStatusSchema,
    deliveryStatus: contactDeliveryStatusSchema,
    deliveryAttempts: z.number().int().nonnegative(),
    lastDeliveryAttemptAt: z.string().datetime().nullable(),
    deliveredAt: z.string().datetime().nullable(),
    lastDeliveryError: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
  })
});

export const updateContactSubmissionResponseSchema = z.object({
  submission: z.object({
    id: z.string().uuid(),
    reviewStatus: contactReviewStatusSchema,
    updatedAt: z.string().datetime()
  })
});

export type ListContactSubmissionsQuery = z.infer<typeof listContactSubmissionsQuerySchema>;
export type ContactSubmissionParams = z.infer<typeof contactSubmissionParamsSchema>;
export type UpdateContactSubmissionBody = z.infer<typeof updateContactSubmissionBodySchema>;
