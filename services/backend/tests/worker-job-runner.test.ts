import { describe, expect, it, vi } from 'vitest';

import { WorkerJobRunner } from '../src/worker/job-runner.js';

describe('WorkerJobRunner', () => {
  it('marks a job as completed when the processor succeeds', async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue({
        id: 'job-1',
        type: 'email_simulation',
        payload: { to: 'student@example.com' },
        maxAttempts: 3,
        priority: 1,
        delayMs: 0,
      }),
      update: vi.fn(),
      createLog: vi.fn(),
    };
    const queue = {
      moveToDeadLetter: vi.fn(),
    };
    const runner = new WorkerJobRunner(
      repository as never,
      queue as never,
      {
        email_simulation: vi.fn().mockResolvedValue({
          summary: 'done',
          metadata: {
            recipient: 'student@example.com',
          },
        }),
        image_processing_simulation: vi.fn(),
        report_generation: vi.fn(),
      },
    );

    await runner.process({
      data: { jobId: 'job-1' },
      attemptsMade: 0,
    } as never);

    expect(repository.update).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ status: 'processing', attempts: 1 }),
    );
    expect(repository.update).toHaveBeenLastCalledWith(
      'job-1',
      expect.objectContaining({ status: 'completed', attempts: 1 }),
    );
  });

  it('moves a job to the dead-letter queue after the last retry fails', async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue({
        id: 'job-2',
        type: 'report_generation',
        payload: { reportName: 'Ops Summary' },
        maxAttempts: 3,
        priority: 1,
        delayMs: 0,
      }),
      update: vi.fn(),
      createLog: vi.fn(),
    };
    const queue = {
      moveToDeadLetter: vi.fn(),
    };
    const runner = new WorkerJobRunner(repository as never, queue as never, {
      email_simulation: vi.fn(),
      image_processing_simulation: vi.fn(),
      report_generation: vi.fn(),
    });

    await runner.handleFailure(
      {
        data: { jobId: 'job-2' },
        attemptsMade: 3,
        opts: {
          backoff: { type: 'exponential', delay: 2000 },
        },
      } as never,
      new Error('processing failed'),
    );

    expect(repository.update).toHaveBeenCalledWith(
      'job-2',
      expect.objectContaining({ status: 'failed' }),
    );
    expect(repository.update).toHaveBeenLastCalledWith(
      'job-2',
      expect.objectContaining({ status: 'dead_lettered' }),
    );
    expect(queue.moveToDeadLetter).toHaveBeenCalledOnce();
  });
});
