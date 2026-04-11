import { ProcessorResult } from '../types.js';
import { getNumber, getString, wait } from './utils.js';

export async function emailSimulationProcessor(
  payload: Record<string, unknown>,
  context: { attemptNumber: number },
): Promise<ProcessorResult> {
  await wait(getNumber(payload, 'processingTimeMs', 800));

  const failUntilAttempt = getNumber(payload, 'failUntilAttempt', 0);
  if (context.attemptNumber <= failUntilAttempt) {
    throw new Error('Simulated SMTP timeout while sending email');
  }

  const recipient = getString(payload, 'to', 'customer@example.com');
  const subject = getString(payload, 'subject', 'Portfolio queue demo email');

  return {
    summary: `Email delivered to ${recipient}`,
    metadata: {
      recipient,
      subject,
      provider: 'simulation',
    },
  };
}
