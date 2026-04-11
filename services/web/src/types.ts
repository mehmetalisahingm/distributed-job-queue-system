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

export type JobStatus = (typeof jobStatuses)[number];
export type JobType = (typeof jobTypes)[number];

export interface JobRecord {
  id: string;
  type: JobType;
  payload: Record<string, unknown>;
  status: JobStatus;
  priority: number;
  delayMs: number;
  attempts: number;
  maxAttempts: number;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  nextRetryAt: string | null;
}

export interface JobLogRecord {
  id: string;
  jobId: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface JobsPayload {
  items: JobRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  statusCounts: Partial<Record<JobStatus, number>>;
}
