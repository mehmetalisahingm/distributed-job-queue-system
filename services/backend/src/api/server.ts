import { createServer } from 'node:http';

import { env } from '../config/env.js';
import { JobRepository } from '../db/repositories/job-repository.js';
import { JobQueueGateway } from '../queue/job-queue.js';
import { logger } from '../shared/logger.js';
import { HealthService } from '../services/health-service.js';
import { JobService } from '../services/job-service.js';
import { prisma } from '../db/client.js';
import { redisConnection } from '../queue/connection.js';
import { createApp } from './create-app.js';
import { MetricsService } from './metrics-service.js';

const repository = new JobRepository();
const queue = new JobQueueGateway();
const metricsService = new MetricsService(repository, queue);
const jobService = new JobService(repository, queue, metricsService);
const healthService = new HealthService(repository, queue);

const app = createApp({
  jobService,
  healthService,
  metricsService,
});

const server = createServer(app);

server.listen(env.port, () => {
  logger.info({ port: env.port }, 'API server listening');
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'shutting down API server');
  server.close(async () => {
    await Promise.allSettled([
      queue.queue.close(),
      queue.deadLetterQueue.close(),
      prisma.$disconnect(),
      redisConnection.quit(),
    ]);
    process.exit(0);
  });
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
