import { PrismaClient } from '@prisma/client';

declare global {
  var __jobQueuePrisma__: PrismaClient | undefined;
}

export const prisma =
  global.__jobQueuePrisma__ ??
  new PrismaClient({
    log: ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__jobQueuePrisma__ = prisma;
}
