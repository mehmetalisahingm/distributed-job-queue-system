import { JobRepository } from '../db/repositories/job-repository.js';
import { JobQueueGateway } from '../queue/job-queue.js';
import { redisConnection } from '../queue/connection.js';
import { logger } from '../shared/logger.js';
import { JobService } from '../services/job-service.js';
import { MetricsService } from '../api/metrics-service.js';
import { prisma } from '../db/client.js';

async function main() {
  const repository = new JobRepository();
  const queue = new JobQueueGateway();
  const metrics = new MetricsService(repository, queue);
  const service = new JobService(repository, queue, metrics);

  const demoJobs = [
    {
      scenario: 'High-priority onboarding email',
      type: 'email_simulation' as const,
      payload: {
        to: 'new.hire@acme-logistics.com',
        subject: 'Welcome to Acme Logistics',
        templateId: 'employee-onboarding-v3',
        correlationId: 'seed-email-001',
        requestedBy: 'hr-ops-service',
        processingTimeMs: 700,
      },
      priority: 8,
    },
    {
      scenario: 'Image processing that succeeds after one retry',
      type: 'image_processing_simulation' as const,
      payload: {
        inputFile: 'uploads/product-catalog/spring-hero.png',
        outputFormat: 'webp',
        dimensions: {
          width: 1920,
          height: 1080,
        },
        requestedBy: 'catalog-api',
        failUntilAttempt: 1,
        processingTimeMs: 1600,
      },
      priority: 7,
    },
    {
      scenario: 'Operations report for customer success leadership',
      type: 'report_generation' as const,
      payload: {
        reportName: 'Weekly Customer Success SLA Report',
        requestedBy: 'analytics-scheduler',
        department: 'customer-success',
        rowsAnalyzed: 5400,
        format: 'pdf',
      },
      priority: 5,
    },
    {
      scenario: 'Delayed product digest email',
      type: 'email_simulation' as const,
      payload: {
        to: 'marketing-team@acme-logistics.com',
        subject: 'Daily campaign digest',
        templateId: 'campaign-digest-v2',
        correlationId: 'seed-email-002',
        requestedBy: 'marketing-automation',
        processingTimeMs: 900,
      },
      priority: 4,
      delay: 12000,
    },
    {
      scenario: 'Large batch report that takes longer to complete',
      type: 'report_generation' as const,
      payload: {
        reportName: 'Quarterly Fulfillment Performance Summary',
        requestedBy: 'exec-analytics-service',
        department: 'operations',
        rowsAnalyzed: 182340,
        format: 'xlsx',
        processingTimeMs: 2200,
      },
      priority: 6,
    },
    {
      scenario: 'Image task that will end up in the dead-letter queue',
      type: 'image_processing_simulation' as const,
      payload: {
        inputFile: 'uploads/vendor-assets/fall-banner.psd',
        outputFormat: 'png',
        requestedBy: 'asset-ingestion-service',
        failUntilAttempt: 10,
        processingTimeMs: 1200,
      },
      priority: 9,
    },
  ];

  for (const job of demoJobs) {
    const createdJob = await service.createJob({
      type: job.type,
      payload: job.payload,
      priority: job.priority,
      ...(job.delay !== undefined ? { delay: job.delay } : {}),
    });

    logger.info(
      {
        jobId: createdJob.id,
        type: job.type,
        scenario: job.scenario,
        delayMs: job.delay ?? 0,
      },
      'seeded demo job',
    );
  }

  await Promise.allSettled([
    queue.queue.close(),
    queue.deadLetterQueue.close(),
    prisma.$disconnect(),
    redisConnection.quit(),
  ]);
}

void main().catch((error) => {
  logger.error({ err: error }, 'failed to seed demo jobs');
  process.exit(1);
});
