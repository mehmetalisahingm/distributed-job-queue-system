import { JobLogLevel, JobStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { MetricsService } from '../api/metrics-service.js';
import { env } from '../config/env.js';
import { JobRepository } from '../db/repositories/job-repository.js';
import { AppError, ConflictError, NotFoundError } from '../shared/errors.js';
import { logger } from '../shared/logger.js';
import { CreateJobInput, ListJobsQuery } from '../shared/schemas.js';
import { JobQueueGateway } from '../queue/job-queue.js';

const retryableStatuses: JobStatus[] = ['failed', 'dead_lettered'];

export class JobService {
  constructor(
    private readonly repository: JobRepository,
    private readonly queue: JobQueueGateway,
    private readonly metricsService: MetricsService,
  ) {}

  async createJob(input: CreateJobInput) {
    const jobId = randomUUID();

    const job = await this.repository.create({
      id: jobId,
      type: input.type,
      payload: input.payload as Prisma.InputJsonValue,
      priority: input.priority ?? 0,
      delayMs: input.delay ?? 0,
      maxAttempts: env.jobMaxAttempts,
      status: 'pending',
    });

    await this.repository.createLog({
      jobId: job.id,
      level: JobLogLevel.info,
      message: 'Job received by API',
      metadata: {
        type: input.type,
        priority: input.priority ?? 0,
        delayMs: input.delay ?? 0,
      },
    });

    try {
      await this.queue.enqueue({
        id: job.id,
        type: input.type,
        payload: input.payload,
        priority: input.priority ?? 0,
        delayMs: input.delay ?? 0,
        maxAttempts: env.jobMaxAttempts,
      });

      const queuedJob = await this.repository.update(job.id, {
        status: 'queued',
        bullJobId: job.id,
      });

      await this.repository.createLog({
        jobId: job.id,
        level: JobLogLevel.info,
        message: 'Job queued in Redis',
        metadata: {
          queueName: env.queueName,
          attempts: env.jobMaxAttempts,
        },
      });

      this.metricsService.recordJobCreated(input.type);
      logger.info({ jobId: job.id, type: input.type }, 'job queued');

      return {
        id: queuedJob.id,
        status: queuedJob.status,
        createdAt: queuedJob.createdAt,
      };
    } catch (error) {
      await this.repository.update(job.id, {
        status: 'failed',
        errorMessage:
          error instanceof Error ? error.message : 'Queue submission failed',
      });
      await this.repository.createLog({
        jobId: job.id,
        level: JobLogLevel.error,
        message: 'Failed to submit job to queue',
        metadata: {
          errorMessage:
            error instanceof Error ? error.message : 'Unknown queue error',
        },
      });
      throw new AppError(
        503,
        'QUEUE_UNAVAILABLE',
        'The queue is temporarily unavailable',
      );
    }
  }

  async listJobs(query: ListJobsQuery) {
    const result = await this.repository.findMany({
      status: query.status,
      type: query.type,
      page: query.page,
      limit: query.limit,
    });

    return {
      items: result.items,
      total: result.total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(result.total / query.limit)),
      statusCounts: result.statusCounts,
    };
  }

  async getJob(jobId: string) {
    const job = await this.repository.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job', { jobId });
    }
    return job;
  }

  async getJobLogs(jobId: string) {
    await this.getJob(jobId);
    return this.repository.findLogs(jobId);
  }

  async retryJob(jobId: string) {
    const job = await this.getJob(jobId);

    if (!retryableStatuses.includes(job.status)) {
      throw new ConflictError(
        'Only failed or dead-lettered jobs can be retried manually',
        { jobId, status: job.status },
      );
    }

    await this.queue.removeJob(jobId);
    await this.repository.update(jobId, {
      attempts: 0,
      status: 'pending',
      errorMessage: null,
      result: Prisma.DbNull,
      startedAt: null,
      completedAt: null,
      nextRetryAt: null,
      bullJobId: jobId,
    });

    await this.repository.createLog({
      jobId,
      level: JobLogLevel.warn,
      message: 'Manual retry requested',
    });

    await this.queue.enqueue({
      id: job.id,
      type: job.type,
      payload: job.payload as Record<string, unknown>,
      priority: job.priority,
      delayMs: 0,
      maxAttempts: job.maxAttempts,
    });

    const retriedJob = await this.repository.update(jobId, {
      status: 'queued',
    });

    await this.repository.createLog({
      jobId,
      level: JobLogLevel.info,
      message: 'Job re-queued after manual retry',
      metadata: {
        attemptsReset: true,
      },
    });

    this.metricsService.recordJobRetried(job.type);
    return retriedJob;
  }

  async deleteJob(jobId: string) {
    const job = await this.getJob(jobId);

    if (job.status === 'processing') {
      throw new ConflictError('Processing jobs cannot be deleted', { jobId });
    }

    await this.queue.removeJob(jobId);
    await this.repository.delete(jobId);
    this.metricsService.recordJobDeleted(job.type);
  }
}
