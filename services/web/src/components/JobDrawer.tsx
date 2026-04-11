import { useMemo } from 'react';
import { RotateCcw, Trash2, X } from 'lucide-react';

import { formatDate, toTitleCase } from '../lib/format';
import { JobLogRecord, JobRecord } from '../types';
import { StatusBadge } from './StatusBadge';

interface JobDrawerProps {
  job: JobRecord | undefined;
  logs: JobLogRecord[] | undefined;
  onClose: () => void;
  onRetry: () => void;
  onDelete: () => void;
  retrying: boolean;
  deleting: boolean;
}

const prettyJson = (value: unknown) => JSON.stringify(value, null, 2);

export function JobDrawer({
  job,
  logs,
  onClose,
  onRetry,
  onDelete,
  retrying,
  deleting,
}: JobDrawerProps) {
  const canRetry = useMemo(
    () => job && ['failed', 'dead_lettered'].includes(job.status),
    [job],
  );

  if (!job) {
    return null;
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-20 w-full max-w-xl overflow-y-auto border-l border-white/10 bg-shell/95 px-6 py-8 shadow-2xl backdrop-blur xl:max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
            Job Detail
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            {toTitleCase(job.type)}
          </h2>
          <div className="mt-2 font-mono text-xs text-slate-500">{job.id}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 p-2 text-slate-300 transition hover:border-white/30 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <StatusBadge status={job.status} />
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
          Attempts {job.attempts}/{job.maxAttempts}
        </span>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
          Priority {job.priority}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {canRetry ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-shell transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" />
            {retrying ? 'Retrying...' : 'Retry Job'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting || job.status === 'processing'}
          className="inline-flex items-center gap-2 rounded-full border border-red-500/30 px-5 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {deleting ? 'Deleting...' : 'Delete Job'}
        </button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <DetailCard label="Created At" value={formatDate(job.createdAt)} />
        <DetailCard label="Updated At" value={formatDate(job.updatedAt)} />
        <DetailCard label="Started At" value={formatDate(job.startedAt)} />
        <DetailCard label="Completed At" value={formatDate(job.completedAt)} />
        <DetailCard label="Next Retry At" value={formatDate(job.nextRetryAt)} />
        <DetailCard label="Delay" value={`${job.delayMs} ms`} />
      </div>

      <div className="mt-8 grid gap-6">
        <JsonSection title="Payload" value={job.payload} />
        <JsonSection title="Result" value={job.result} />
        {job.errorMessage ? (
          <section className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-red-200">Error</div>
            <p className="mt-3 text-sm text-red-100">{job.errorMessage}</p>
          </section>
        ) : null}
        <section className="rounded-3xl border border-white/10 bg-card/80 p-5">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Logs</div>
          <div className="mt-4 space-y-3">
            {(logs ?? []).length === 0 ? (
              <p className="text-sm text-slate-400">No logs stored for this job yet.</p>
            ) : (
              logs?.map((log) => (
                <div key={log.id} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                      {log.level}
                    </span>
                    <span className="text-xs text-slate-500">{formatDate(log.createdAt)}</span>
                  </div>
                  <p className="mt-3 text-sm text-white">{log.message}</p>
                  {log.metadata ? (
                    <pre className="mt-3 overflow-x-auto rounded-2xl bg-shell/60 p-4 font-mono text-xs text-slate-300">
                      {prettyJson(log.metadata)}
                    </pre>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-card/80 p-5">
      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</div>
      <div className="mt-3 text-sm text-white">{value}</div>
    </div>
  );
}

function JsonSection({ title, value }: { title: string; value: unknown }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-card/80 p-5">
      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{title}</div>
      <pre className="mt-4 overflow-x-auto rounded-2xl bg-shell/60 p-4 font-mono text-xs text-slate-200">
        {prettyJson(value)}
      </pre>
    </section>
  );
}
