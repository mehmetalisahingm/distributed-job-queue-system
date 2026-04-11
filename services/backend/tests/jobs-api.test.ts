import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/api/create-app.js';

const jobService = {
  createJob: vi.fn(),
  listJobs: vi.fn(),
  getJob: vi.fn(),
  getJobLogs: vi.fn(),
  retryJob: vi.fn(),
  deleteJob: vi.fn(),
};

const healthService = {
  getHealthStatus: vi.fn(),
};

const metricsService = {
  contentType: 'text/plain; version=0.0.4; charset=utf-8' as const,
  renderMetrics: vi.fn(),
  recordHttpRequest: vi.fn(),
};

describe('jobs API', () => {
  it('creates a job and returns its tracking payload', async () => {
    jobService.createJob.mockResolvedValue({
      id: '6e2467db-2d95-4a54-b5af-2a6c8dff2b08',
      status: 'queued',
      createdAt: '2026-04-11T10:00:00.000Z',
    });

    const app = createApp({
      jobService,
      healthService,
      metricsService,
    });

    const response = await request(app).post('/api/jobs').send({
      type: 'email_simulation',
      payload: {
        to: 'student@example.com',
      },
      priority: 4,
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      id: '6e2467db-2d95-4a54-b5af-2a6c8dff2b08',
      status: 'queued',
    });
    expect(jobService.createJob).toHaveBeenCalledOnce();
  });

  it('rejects malformed job creation requests', async () => {
    const app = createApp({
      jobService,
      healthService,
      metricsService,
    });

    const response = await request(app).post('/api/jobs').send({
      type: 'unsupported_job',
      payload: {},
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
