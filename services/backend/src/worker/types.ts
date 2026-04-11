import { JobType } from '../shared/domain.js';

export interface ProcessorContext {
  attemptNumber: number;
  maxAttempts: number;
}

export interface ProcessorResult {
  summary: string;
  metadata: Record<string, unknown>;
}

export type JobProcessor = (
  payload: Record<string, unknown>,
  context: ProcessorContext,
) => Promise<ProcessorResult>;

export type ProcessorRegistry = Record<JobType, JobProcessor>;
