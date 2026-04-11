import { JobLogLevel, Prisma } from '@prisma/client';
import { Job } from 'bullmq';

import { env } from '../config/env.js';
import { JobRepository } from '../db/repositories/job-repository.js';
import { JobQueueGateway, QueueJobPayload } from '../queue/job-queue.js';
import { logger } from '../shared/logger.js';
import { ProcessorRegistry } from './types.js';

const getBackoffDelay = (job: Job<QueueJobPayload>) => {
  const backoff = job.opts.backoff;
  if (typeof backoff === 'number') {
    return backoff;
  }

  if (typeof backoff === 'object' && backoff && 'delay' in backoff) {
    return typeof backoff.delay === 'number'
      ? backoff.delay
      : env.jobBackoffDelayMs;
  }

  return env.jobBackoffDelayMs;
};

export class WorkerJobRunner {
  constructor(
    private readonly repository: JobRepository,
    private readonly queue: JobQueueGateway,
    private readonly processors: ProcessorRegistry,
  ) {}

  async process(job: Job<QueueJobPayload>) {
    const storedJob = await this.repository.findById(job.data.jobId);
    if (!storedJob) {
      throw new Error(`Job ${job.data.jobId} no longer exists in the database`);
    }

    const processor = this.processors[storedJob.type];
    if (!processor) {
      throw new Error(`No processor registered for job type ${storedJob.type}`);
    }

    const attemptNumber = job.attemptsMade + 1;
    await this.repository.update(storedJob.id, {
      status: 'processing',
      attempts: attemptNumber,
      startedAt: new Date(),
      errorMessage: null,
      nextRetryAt: null,
    });
    await this.repository.createLog({
      jobId: storedJob.id,
      level: JobLogLevel.info,
      message: 'Job started by worker',
      metadata: {
        attemptNumber,
        maxAttempts: storedJob.maxAttempts,
      },
    });

    logger.info(
      { jobId: storedJob.id, type: storedJob.type, attemptNumber },
      'job started',
    );

    const result = await processor(storedJob.payload as Record<string, unknown>, {
      attemptNumber,
      maxAttempts: storedJob.maxAttempts,
    });

    await this.repository.update(storedJob.id, {
      status: 'completed',
      attempts: attemptNumber,
      result: {
        summary: result.summary,
        ...result.metadata,
      } as Prisma.InputJsonValue,
      completedAt: new Date(),
      errorMessage: null,
      nextRetryAt: null,
    });
    await this.repository.createLog({
      jobId: storedJob.id,
      level: JobLogLevel.info,
      message: 'Job completed successfully',
      metadata: {
        attemptNumber,
        summary: result.summary,
        result: result.metadata as Prisma.InputJsonValue,
      } as Prisma.InputJsonValue,
    });

    logger.info(
      { jobId: storedJob.id, type: storedJob.type, summary: result.summary },
      'job completed',
    );

    return result;
  }

  async handleFailure(job: Job<QueueJobPayload>, error: Error) {
    const storedJob = await this.repository.findById(job.data.jobId);
    if (!storedJob) {
      logger.warn({ jobId: job.data.jobId }, 'failed job missing from database');
      return;
    }

    const attemptsMade = job.attemptsMade;
    const maxAttempts = storedJob.maxAttempts;
    const commonUpdate = {
      attempts: attemptsMade,
      errorMessage: error.message,
    };

    if (attemptsMade < maxAttempts) {
      const retryDelay = getBackoffDelay(job) * Math.max(1, 2 ** (attemptsMade - 1));
      const nextRetryAt = new Date(Date.now() + retryDelay);

      await this.repository.update(storedJob.id, {
        ...commonUpdate,
        status: 'retrying',
        nextRetryAt,
      });
      await this.repository.createLog({
        jobId: storedJob.id,
        level: JobLogLevel.warn,
        message: 'Job failed and will be retried automatically',
        metadata: {
          attemptNumber: attemptsMade,
          nextRetryAt: nextRetryAt.toISOString(),
          errorMessage: error.message,
        },
      });

      logger.warn(
        {
          jobId: storedJob.id,
          type: storedJob.type,
          attemptsMade,
          maxAttempts,
          nextRetryAt: nextRetryAt.toISOString(),
        },
        'job scheduled for retry',
      );
      return;
    }

    await this.repository.update(storedJob.id, {
      ...commonUpdate,
      status: 'failed',
      nextRetryAt: null,
      completedAt: new Date(),
    });
    await this.repository.createLog({
      jobId: storedJob.id,
      level: JobLogLevel.error,
      message: 'Job exhausted retries and marked as failed',
      metadata: {
        attemptsMade,
        maxAttempts,
        errorMessage: error.message,
      },
    });

    await this.queue.moveToDeadLetter(
      {
        id: storedJob.id,
        type: storedJob.type,
        payload: storedJob.payload as Record<string, unknown>,
        priority: storedJob.priority,
        delayMs: storedJob.delayMs,
        maxAttempts: storedJob.maxAttempts,
      },
      error.message,
    );

    await this.repository.update(storedJob.id, {
      status: 'dead_lettered',
      nextRetryAt: null,
    });
    await this.repository.createLog({
      jobId: storedJob.id,
      level: JobLogLevel.error,
      message: 'Job moved to dead-letter queue',
      metadata: {
        queueName: env.deadLetterQueueName,
      },
    });

    logger.error(
      { jobId: storedJob.id, type: storedJob.type, attemptsMade, maxAttempts },
      'job moved to dead-letter queue',
    );
  }
}
