import { JobLogLevel, JobStatus, JobType, Prisma } from '@prisma/client';

import { prisma } from '../client.js';

export interface JobListFilters {
  status: JobStatus | undefined;
  type: JobType | undefined;
  page: number;
  limit: number;
}

export interface JobLogInput {
  jobId: string;
  level: JobLogLevel;
  message: string;
  metadata?: Prisma.InputJsonValue;
}

export class JobRepository {
  async create(data: {
    id?: string;
    type: JobType;
    payload: Prisma.InputJsonValue;
    priority: number;
    delayMs: number;
    maxAttempts: number;
    status: JobStatus;
  }) {
    return prisma.job.create({
      data,
    });
  }

  async update(
    jobId: string,
    data: Prisma.JobUncheckedUpdateInput,
  ) {
    return prisma.job.update({
      where: { id: jobId },
      data,
    });
  }

  async findById(jobId: string) {
    return prisma.job.findUnique({
      where: { id: jobId },
    });
  }

  async findMany(filters: JobListFilters) {
    const where: Prisma.JobWhereInput = {};
    const statusCountsWhere: Prisma.JobWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.type) {
      where.type = filters.type;
      statusCountsWhere.type = filters.type;
    }

    const [items, total, groupedByStatus] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.job.count({ where }),
      prisma.job.groupBy({
        by: ['status'],
        where: statusCountsWhere,
        _count: { status: true },
      }),
    ]);

    return {
      items,
      total,
      statusCounts: groupedByStatus.reduce<Record<string, number>>(
        (accumulator, group) => {
          accumulator[group.status] = group._count.status;
          return accumulator;
        },
        {},
      ),
    };
  }

  async delete(jobId: string) {
    return prisma.job.delete({
      where: { id: jobId },
    });
  }

  async createLog(input: JobLogInput) {
    return prisma.jobLog.create({
      data: input,
    });
  }

  async findLogs(jobId: string) {
    return prisma.jobLog.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStatusBreakdown() {
    const rows = await prisma.job.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    return rows.reduce<Record<string, number>>((accumulator, row) => {
      accumulator[row.status] = row._count.status;
      return accumulator;
    }, {});
  }

  async healthCheck() {
    await prisma.$queryRaw`SELECT 1`;
  }
}
