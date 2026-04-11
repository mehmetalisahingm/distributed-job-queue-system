import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { ZodError, ZodType } from 'zod';

import { env } from '../config/env.js';
import { AppError } from '../shared/errors.js';
import { logger } from '../shared/logger.js';
import {
  createJobSchema,
  jobIdParamSchema,
  listJobsQuerySchema,
} from '../shared/schemas.js';
import { HealthService } from '../services/health-service.js';
import { JobService } from '../services/job-service.js';
import { MetricsService } from './metrics-service.js';

export interface ApiDependencies {
  jobService: Pick<
    JobService,
    'createJob' | 'listJobs' | 'getJob' | 'getJobLogs' | 'retryJob' | 'deleteJob'
  >;
  healthService: Pick<HealthService, 'getHealthStatus'>;
  metricsService: Pick<
    MetricsService,
    'contentType' | 'renderMetrics' | 'recordHttpRequest'
  >;
}

const parse = <T>(schema: ZodType<T>, input: unknown): T => {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', {
      issues: result.error.issues,
    });
  }
  return result.data;
};

const errorHandler = (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) => {
  if (error instanceof AppError) {
    return response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  if (error instanceof ZodError) {
    return response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          issues: error.issues,
        },
      },
    });
  }

  logger.error({ err: error }, 'unhandled API error');

  return response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
};

export function createApp(dependencies: ApiDependencies) {
  const app = express();

  app.use(
    cors({
      origin: env.webOrigin,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use((request, response, next) => {
    const startedAt = Date.now();

    response.on('finish', () => {
      const logPayload = {
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
      };

      if (response.statusCode >= 500) {
        logger.error(logPayload, 'request completed with server error');
      } else if (response.statusCode >= 400) {
        logger.warn(logPayload, 'request completed with client error');
      } else {
        logger.info(logPayload, 'request completed');
      }
    });

    next();
  });
  app.use((request, response, next) => {
    response.on('finish', () => {
      dependencies.metricsService.recordHttpRequest({
        method: request.method,
        route: request.path,
        statusCode: response.statusCode,
      });
    });
    next();
  });

  app.get('/api/health', async (_request, response) => {
    const status = await dependencies.healthService.getHealthStatus();
    const statusCode = status.status === 'ok' ? 200 : 503;
    return response.status(statusCode).json({ data: status });
  });

  app.get('/api/metrics', async (_request, response) => {
    const metrics = await dependencies.metricsService.renderMetrics();
    response.setHeader('Content-Type', dependencies.metricsService.contentType);
    return response.status(200).send(metrics);
  });

  app.post('/api/jobs', async (request, response) => {
    const payload = parse(createJobSchema, request.body);
    const job = await dependencies.jobService.createJob(payload);

    return response.status(201).json({
      data: job,
    });
  });

  app.get('/api/jobs', async (request, response) => {
    const query = parse(listJobsQuerySchema, request.query);
    const jobs = await dependencies.jobService.listJobs(query);

    return response.status(200).json({
      data: jobs,
    });
  });

  app.get('/api/jobs/:id', async (request, response) => {
    const params = parse(jobIdParamSchema, request.params);
    const job = await dependencies.jobService.getJob(params.id);

    return response.status(200).json({
      data: job,
    });
  });

  app.get('/api/jobs/:id/logs', async (request, response) => {
    const params = parse(jobIdParamSchema, request.params);
    const logs = await dependencies.jobService.getJobLogs(params.id);

    return response.status(200).json({
      data: logs,
    });
  });

  app.post('/api/jobs/:id/retry', async (request, response) => {
    const params = parse(jobIdParamSchema, request.params);
    const job = await dependencies.jobService.retryJob(params.id);

    return response.status(200).json({
      data: {
        id: job.id,
        status: job.status,
        updatedAt: job.updatedAt,
      },
    });
  });

  app.delete('/api/jobs/:id', async (request, response) => {
    const params = parse(jobIdParamSchema, request.params);
    await dependencies.jobService.deleteJob(params.id);
    return response.status(204).send();
  });

  app.use((_request, response) => {
    response.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource does not exist',
      },
    });
  });
  app.use(errorHandler);

  return app;
}
