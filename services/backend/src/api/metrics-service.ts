import { Counter, Gauge, Registry, collectDefaultMetrics } from 'prom-client';

import { env } from '../config/env.js';
import { JobRepository } from '../db/repositories/job-repository.js';
import { JobQueueGateway } from '../queue/job-queue.js';
import { JobType } from '../shared/domain.js';

export class MetricsService {
  readonly registry = new Registry();
  readonly contentType = this.registry.contentType;

  private readonly httpRequestsTotal = new Counter({
    name: `${env.metricsPrefix}http_requests_total`,
    help: 'Total number of HTTP requests served by the API',
    labelNames: ['method', 'route', 'status_code'],
    registers: [this.registry],
  });

  private readonly jobsCreatedTotal = new Counter({
    name: `${env.metricsPrefix}jobs_created_total`,
    help: 'Total number of jobs created via the API',
    labelNames: ['type'],
    registers: [this.registry],
  });

  private readonly jobsRetriedTotal = new Counter({
    name: `${env.metricsPrefix}jobs_retried_total`,
    help: 'Total number of manual retry requests',
    labelNames: ['type'],
    registers: [this.registry],
  });

  private readonly jobsDeletedTotal = new Counter({
    name: `${env.metricsPrefix}jobs_deleted_total`,
    help: 'Total number of deleted jobs',
    labelNames: ['type'],
    registers: [this.registry],
  });

  private readonly queueDepthGauge = new Gauge({
    name: `${env.metricsPrefix}queue_jobs`,
    help: 'BullMQ queue depth grouped by state',
    labelNames: ['state'],
    registers: [this.registry],
  });

  private readonly databaseJobsGauge = new Gauge({
    name: `${env.metricsPrefix}database_jobs`,
    help: 'Persisted jobs grouped by status',
    labelNames: ['status'],
    registers: [this.registry],
  });

  constructor(
    private readonly repository: JobRepository,
    private readonly queue: JobQueueGateway,
  ) {
    collectDefaultMetrics({
      register: this.registry,
      prefix: env.metricsPrefix,
    });
  }

  recordHttpRequest(input: {
    method: string;
    route: string;
    statusCode: number;
  }) {
    this.httpRequestsTotal.inc({
      method: input.method,
      route: input.route,
      status_code: String(input.statusCode),
    });
  }

  recordJobCreated(type: JobType) {
    this.jobsCreatedTotal.inc({ type });
  }

  recordJobRetried(type: JobType) {
    this.jobsRetriedTotal.inc({ type });
  }

  recordJobDeleted(type: JobType) {
    this.jobsDeletedTotal.inc({ type });
  }

  async renderMetrics() {
    const [queueCounts, databaseCounts] = await Promise.all([
      this.queue.getCounts(),
      this.repository.getStatusBreakdown(),
    ]);

    this.queueDepthGauge.reset();
    for (const [state, value] of Object.entries(queueCounts)) {
      this.queueDepthGauge.set({ state }, value);
    }

    this.databaseJobsGauge.reset();
    for (const [status, value] of Object.entries(databaseCounts)) {
      this.databaseJobsGauge.set({ status }, value);
    }

    return this.registry.metrics();
  }
}
