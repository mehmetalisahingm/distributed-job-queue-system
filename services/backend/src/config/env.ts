import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://jobqueue:jobqueue@localhost:5432/job_queue?schema=public'),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  QUEUE_NAME: z.string().default('jobs'),
  DEAD_LETTER_QUEUE_NAME: z.string().default('jobs-dead-letter'),
  JOB_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  JOB_BACKOFF_DELAY_MS: z.coerce.number().int().min(100).default(2000),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(4),
  METRICS_PREFIX: z.string().default('distributed_job_queue_'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid environment configuration: ${parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ')}`,
  );
}

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  webOrigin: parsed.data.WEB_ORIGIN,
  databaseUrl: parsed.data.DATABASE_URL,
  redisUrl: parsed.data.REDIS_URL,
  queueName: parsed.data.QUEUE_NAME,
  deadLetterQueueName: parsed.data.DEAD_LETTER_QUEUE_NAME,
  jobMaxAttempts: parsed.data.JOB_MAX_ATTEMPTS,
  jobBackoffDelayMs: parsed.data.JOB_BACKOFF_DELAY_MS,
  workerConcurrency: parsed.data.WORKER_CONCURRENCY,
  metricsPrefix: parsed.data.METRICS_PREFIX,
} as const;
