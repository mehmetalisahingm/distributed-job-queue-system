import { LoaderCircle } from 'lucide-react';

import { formatDate, toTitleCase } from '../lib/format';
import { JobRecord } from '../types';
import { StatusBadge } from './StatusBadge';

interface JobsTableProps {
  jobs: JobRecord[];
  selectedJobId: string | undefined;
  loading: boolean;
  onSelect: (jobId: string) => void;
}

export function JobsTable({
  jobs,
  selectedJobId,
  loading,
  onSelect,
}: JobsTableProps) {
  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-white/10 bg-card/70">
        <LoaderCircle className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 bg-card/50 p-10 text-center">
        <p className="text-lg font-semibold text-white">No jobs match the current filters.</p>
        <p className="mt-2 text-sm text-slate-400">
          Submit a new job through the API or clear the dashboard filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-card/80 shadow-glow backdrop-blur">
      <div className="grid grid-cols-[1.3fr,1fr,0.8fr,0.7fr,1fr] gap-4 border-b border-white/10 px-6 py-4 text-xs uppercase tracking-[0.2em] text-slate-400">
        <span>Job</span>
        <span>Status</span>
        <span>Attempts</span>
        <span>Priority</span>
        <span>Updated</span>
      </div>
      <div className="divide-y divide-white/5">
        {jobs.map((job) => (
          <button
            key={job.id}
            type="button"
            onClick={() => onSelect(job.id)}
            className={`grid w-full grid-cols-[1.3fr,1fr,0.8fr,0.7fr,1fr] gap-4 px-6 py-4 text-left transition hover:bg-white/5 ${
              selectedJobId === job.id ? 'bg-white/8' : ''
            }`}
          >
            <div>
              <div className="font-semibold text-white">{toTitleCase(job.type)}</div>
              <div className="mt-1 font-mono text-xs text-slate-400">{job.id}</div>
            </div>
            <div>
              <StatusBadge status={job.status} />
            </div>
            <div className="text-sm text-slate-200">
              {job.attempts}/{job.maxAttempts}
            </div>
            <div className="text-sm text-slate-200">{job.priority}</div>
            <div className="text-sm text-slate-300">{formatDate(job.updatedAt)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
