import pino from 'pino';

import { env } from '../config/env.js';

export const logger = pino({
  level: env.nodeEnv === 'production' ? 'info' : 'debug',
  base: {
    service: 'distributed-job-queue',
    env: env.nodeEnv,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
