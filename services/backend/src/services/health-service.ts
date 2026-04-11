import { JobRepository } from '../db/repositories/job-repository.js';
import { JobQueueGateway } from '../queue/job-queue.js';

export class HealthService {
  constructor(
    private readonly repository: JobRepository,
    private readonly queue: JobQueueGateway,
  ) {}

  async getHealthStatus() {
    const startedAt = Date.now();
    const checks = {
      database: 'down' as 'up' | 'down',
      redis: 'down' as 'up' | 'down',
    };

    try {
      await this.repository.healthCheck();
      checks.database = 'up';
    } catch {
      checks.database = 'down';
    }

    try {
      await this.queue.healthCheck();
      checks.redis = 'up';
    } catch {
      checks.redis = 'down';
    }

    const overall = Object.values(checks).every((value) => value === 'up')
      ? 'ok'
      : 'degraded';

    return {
      status: overall,
      checks,
      uptimeMs: process.uptime() * 1000,
      responseTimeMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    };
  }
}
