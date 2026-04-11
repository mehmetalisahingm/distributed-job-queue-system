import { JobsOptions, Queue } from 'bullmq';

import { env } from '../config/env.js';
import { QueueableJob } from '../shared/domain.js';
import { redisConnection } from './connection.js';

export interface QueueJobPayload {
  jobId: string;
  type: QueueableJob['type'];
  payload: QueueableJob['payload'];
}

export class JobQueueGateway {
  readonly queue: Queue<QueueJobPayload>;
  readonly deadLetterQueue: Queue<QueueJobPayload>;

  constructor() {
    this.queue = new Queue<QueueJobPayload>(env.queueName, {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: false,
      },
    });
    this.deadLetterQueue = new Queue<QueueJobPayload>(env.deadLetterQueueName, {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: false,
        removeOnFail: false,
      },
    });
  }

  async enqueue(job: QueueableJob) {
    const options: JobsOptions = {
      jobId: job.id,
      attempts: job.maxAttempts,
      delay: job.delayMs,
      priority: job.priority,
      backoff: {
        type: 'exponential',
        delay: env.jobBackoffDelayMs,
      },
      removeOnComplete: 100,
      removeOnFail: false,
    };

    await this.queue.add(
      job.type,
      {
        jobId: job.id,
        type: job.type,
        payload: job.payload,
      },
      options,
    );
  }

  async moveToDeadLetter(
    job: QueueableJob,
    errorMessage: string,
  ) {
    await this.deadLetterQueue.add(
      `${job.type}:dead-letter`,
      {
        jobId: job.id,
        type: job.type,
        payload: {
          ...job.payload,
          errorMessage,
        },
      },
      {
        jobId: `${job.id}:dead-letter`,
        removeOnComplete: false,
        removeOnFail: false,
      },
    );
  }

  async removeJob(jobId: string) {
    const [activeJob, deadLetterJob] = await Promise.all([
      this.queue.getJob(jobId),
      this.deadLetterQueue.getJob(`${jobId}:dead-letter`),
    ]);

    if (activeJob) {
      await activeJob.remove();
    }

    if (deadLetterJob) {
      await deadLetterJob.remove();
    }
  }

  async getCounts() {
    const [mainCounts, deadLetterCounts] = await Promise.all([
      this.queue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
        'prioritized',
      ),
      this.deadLetterQueue.getJobCounts('waiting'),
    ]);

    return {
      ...mainCounts,
      deadLetterWaiting: deadLetterCounts.waiting ?? 0,
    };
  }

  async healthCheck() {
    await redisConnection.ping();
  }
}
