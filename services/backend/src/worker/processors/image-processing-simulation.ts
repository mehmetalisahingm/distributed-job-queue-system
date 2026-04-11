import { ProcessorResult } from '../types.js';
import { getNumber, getString, wait } from './utils.js';

export async function imageProcessingSimulationProcessor(
  payload: Record<string, unknown>,
  context: { attemptNumber: number },
): Promise<ProcessorResult> {
  await wait(getNumber(payload, 'processingTimeMs', 1800));

  const failUntilAttempt = getNumber(payload, 'failUntilAttempt', 0);
  if (context.attemptNumber <= failUntilAttempt) {
    throw new Error('Simulated image transform worker overload');
  }

  const inputFile = getString(payload, 'inputFile', 'uploads/source.jpg');
  const outputFormat = getString(payload, 'outputFormat', 'webp');

  return {
    summary: `Image processing complete for ${inputFile}`,
    metadata: {
      inputFile,
      outputFormat,
      outputPath: `processed/${Date.now()}.${outputFormat}`,
    },
  };
}
