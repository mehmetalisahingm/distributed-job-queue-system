import { JobStatus } from '../types';
import { statusClasses, toTitleCase } from '../lib/format';

interface StatusBadgeProps {
  status: JobStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClasses[status]}`}
    >
      {toTitleCase(status)}
    </span>
  );
}
