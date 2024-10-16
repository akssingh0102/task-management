import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().max(255),
  email: z.string().email(),
  password: z.string().min(6, 'Password should be minimum 6 character long'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
