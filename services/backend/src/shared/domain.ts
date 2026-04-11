export const jobStatuses = [
  'pending',
  'queued',
  'processing',
  'completed',
  'failed',
  'retrying',
  'dead_lettered',
] as const;

export const jobTypes = [
  'email_simulation',
  'image_processing_simulation',
  'report_generation',
] as const;

export const logLevels = ['info', 'warn', 'error'] as const;

export type JobStatus = (typeof jobStatuses)[number];
export type JobType = (typeof jobTypes)[number];
export type JobLogLevel = (typeof logLevels)[number];

export type JsonObject = Record<string, unknown>;

export interface QueueableJob {
  id: string;
  type: JobType;
  payload: JsonObject;
  priority: number;
  delayMs: number;
  maxAttempts: number;
}
