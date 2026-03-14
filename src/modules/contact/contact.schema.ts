import { z } from 'zod';

export const contactBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  subject: z.string().trim().min(2).max(140),
  email: z.string().trim().email().max(320),
  message: z.string().trim().min(1).max(2000),
  website: z.string().trim().max(256).optional(),
  captchaToken: z.string().trim().min(1).max(4000).optional()
});

export const contactResponseSchema = z.object({
  success: z.literal(true),
  message: z.literal('Contact request received')
});

export type ContactBody = z.infer<typeof contactBodySchema>;
export type ContactResponse = z.infer<typeof contactResponseSchema>;
