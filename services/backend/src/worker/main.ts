import { Worker } from 'bullmq';

import { env } from '../config/env.js';
import { JobRepository } from '../db/repositories/job-repository.js';
import { JobQueueGateway } from '../queue/job-queue.js';
import { redisConnection } from '../queue/connection.js';
import { logger } from '../shared/logger.js';
import { prisma } from '../db/client.js';
import { processors } from './processors/index.js';
import { WorkerJobRunner } from './job-runner.js';

const repository = new JobRepository();
const queue = new JobQueueGateway();
const runner = new WorkerJobRunner(repository, queue, processors);

const worker = new Worker(
  env.queueName,
  async (job) => runner.process(job),
  {
    connection: redisConnection,
    concurrency: env.workerConcurrency,
  },
);

worker.on('ready', () => {
  logger.info(
    {
      queueName: env.queueName,
      concurrency: env.workerConcurrency,
    },
    'worker ready',
  );
});

worker.on('failed', (job, error) => {
  if (!job) {
    logger.error({ err: error }, 'worker failed without job context');
    return;
  }

  void runner.handleFailure(job, error).catch((handlerError) => {
    logger.error({ err: handlerError, jobId: job.id }, 'failed to persist worker failure');
  });
});

worker.on('error', (error) => {
  logger.error({ err: error }, 'worker infrastructure error');
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'shutting down worker');
  await Promise.allSettled([
    worker.close(),
    queue.queue.close(),
    queue.deadLetterQueue.close(),
    prisma.$disconnect(),
    redisConnection.quit(),
  ]);
  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
