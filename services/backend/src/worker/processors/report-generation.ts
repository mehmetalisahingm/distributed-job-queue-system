import { ProcessorResult } from '../types.js';
import { getNumber, getString, wait } from './utils.js';

export async function reportGenerationProcessor(
  payload: Record<string, unknown>,
  context: { attemptNumber: number },
): Promise<ProcessorResult> {
  await wait(getNumber(payload, 'processingTimeMs', 1300));

  const failUntilAttempt = getNumber(payload, 'failUntilAttempt', 0);
  if (context.attemptNumber <= failUntilAttempt) {
    throw new Error('Simulated report export failure');
  }

  const reportName = getString(payload, 'reportName', 'Monthly Ops Summary');
  const requestedBy = getString(payload, 'requestedBy', 'systems-demo');

  return {
    summary: `Report "${reportName}" generated successfully`,
    metadata: {
      reportName,
      requestedBy,
      rowsAnalyzed: getNumber(payload, 'rowsAnalyzed', 1280),
      generatedAt: new Date().toISOString(),
    },
  };
}
