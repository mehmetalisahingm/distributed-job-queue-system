import { z } from 'zod';

import { jobStatuses, jobTypes } from './domain.js';

export const createJobSchema = z.object({
  type: z.enum(jobTypes),
  payload: z.record(z.string(), z.unknown()),
  priority: z.number().int().min(0).max(10).optional(),
  delay: z.number().int().min(0).max(1000 * 60 * 60 * 24).optional(),
});

export const listJobsQuerySchema = z.object({
  status: z.enum(jobStatuses).optional(),
  type: z.enum(jobTypes).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const jobIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>;
