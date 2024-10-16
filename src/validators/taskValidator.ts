// src/validators/taskValidator.ts
import { z } from 'zod';

// export const createTaskSchema = z.object({
//   title: z.string().max(255, 'Title must not exceed 255 characters'),
//   description: z.string().min(1, 'Description is required'),
//   status: z.enum(['pending', 'in_progress', 'completed']),
//   priority: z.enum(['low', 'medium', 'high']),
//   due_date: z.string().optional(),
//   project_id: z.string().uuid(),
//   assigned_user_id: z.string().uuid(),
// });

export const taskSchema = z.object({
  title: z.string().max(255, 'Title must not exceed 255 characters'),
  description: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  priority: z.enum(['low', 'medium', 'high']),
  due_date: z.string().transform((str) => new Date(str)), // Transform string to Date
  project_id: z.string().uuid(),
  assigned_user_id: z.string().uuid(),
});

export const updateTaskSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assigned_user_id: z.string().uuid().optional(),
});

export const queryTaskSchema = z.object({
  project_id: z.string().uuid().optional(),
  assigned_user_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  due_in_days: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 0, {
      message: 'due_in_days must be a positive number',
    })
    .optional(),
  comment_keyword: z
    .string()
    .min(3, 'Keyword should be at least 3 characters long')
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform((val) => parseInt(val, 10))
    .optional(),
  offset: z
    .string()
    .regex(/^\d+$/)
    .transform((val) => parseInt(val, 10))
    .optional(),
});
