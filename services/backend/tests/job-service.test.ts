import { describe, expect, it, vi } from 'vitest';

import { JobService } from '../src/services/job-service.js';

describe('JobService', () => {
  it('creates a database record and enqueues it', async () => {
    const repository = {
      create: vi.fn().mockResolvedValue({
        id: 'job-1',
        status: 'pending',
        createdAt: new Date('2026-04-11T10:00:00.000Z'),
      }),
      createLog: vi.fn(),
      update: vi.fn().mockResolvedValue({
        id: 'job-1',
        status: 'queued',
        createdAt: new Date('2026-04-11T10:00:00.000Z'),
      }),
    };
    const queue = {
      enqueue: vi.fn(),
    };
    const metrics = {
      recordJobCreated: vi.fn(),
      recordJobRetried: vi.fn(),
      recordJobDeleted: vi.fn(),
    };

    const service = new JobService(
      repository as never,
      queue as never,
      metrics as never,
    );

    const result = await service.createJob({
      type: 'report_generation',
      payload: {
        reportName: 'Demo',
      },
      priority: 3,
    });

    expect(repository.create).toHaveBeenCalledOnce();
    expect(queue.enqueue).toHaveBeenCalledOnce();
    expect(result.status).toBe('queued');
    expect(metrics.recordJobCreated).toHaveBeenCalledWith('report_generation');
  });
});
