import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('mono256_my-profile-api')
});

export const readinessOkResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('mono256_my-profile-api'),
  dependencies: z.object({
    database: z.literal('up')
  })
});

export const readinessDegradedResponseSchema = z.object({
  status: z.literal('degraded'),
  service: z.literal('mono256_my-profile-api'),
  dependencies: z.object({
    database: z.literal('down')
  })
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ReadinessOkResponse = z.infer<typeof readinessOkResponseSchema>;
export type ReadinessDegradedResponse = z.infer<typeof readinessDegradedResponseSchema>;
