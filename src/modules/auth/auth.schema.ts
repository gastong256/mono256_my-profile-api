import { z } from 'zod';

const authUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string()
});

export const loginBodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128)
});

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal('Bearer'),
  expiresIn: z.string(),
  user: authUserSchema
});

export const meResponseSchema = z.object({
  user: authUserSchema
});

export type LoginBody = z.infer<typeof loginBodySchema>;
