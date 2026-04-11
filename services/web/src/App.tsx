import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCcw, TriangleAlert } from 'lucide-react';

import { JobDrawer } from './components/JobDrawer';
import { JobsTable } from './components/JobsTable';
import { MetricCard } from './components/MetricCard';
import { api } from './lib/api';
import { toTitleCase } from './lib/format';
import { jobStatuses, jobTypes, JobStatus, JobType } from './types';

const allStatusValue = 'all';
const allTypeValue = 'all';

export function App() {
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState<string>();
  const [statusFilter, setStatusFilter] = useState<JobStatus | typeof allStatusValue>(
    allStatusValue,
  );
  const [typeFilter, setTypeFilter] = useState<JobType | typeof allTypeValue>(
    allTypeValue,
  );

  const jobsQuery = useQuery({
    queryKey: ['jobs', statusFilter, typeFilter],
    queryFn: () =>
      api.listJobs({
        status: statusFilter === allStatusValue ? undefined : statusFilter,
        type: typeFilter === allTypeValue ? undefined : typeFilter,
      }),
    refetchInterval: 5000,
  });

  const selectedJobQuery = useQuery({
    queryKey: ['job', selectedJobId],
    queryFn: () => api.getJob(selectedJobId!),
    enabled: Boolean(selectedJobId),
    refetchInterval: 5000,
  });

  const selectedJobLogsQuery = useQuery({
    queryKey: ['job-logs', selectedJobId],
    queryFn: () => api.getJobLogs(selectedJobId!),
    enabled: Boolean(selectedJobId),
    refetchInterval: 5000,
  });

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => api.retryJob(jobId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['job', selectedJobId] }),
        queryClient.invalidateQueries({ queryKey: ['job-logs', selectedJobId] }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (jobId: string) => api.deleteJob(jobId),
    onSuccess: async (_, jobId) => {
      if (selectedJobId === jobId) {
        setSelectedJobId(undefined);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['jobs'] }),
        queryClient.removeQueries({ queryKey: ['job', jobId] }),
        queryClient.removeQueries({ queryKey: ['job-logs', jobId] }),
      ]);
    },
  });

  const summary = useMemo(() => {
    const counts = jobsQuery.data?.statusCounts ?? {};
    return {
      total: jobsQuery.data?.total ?? 0,
      queued: counts.queued ?? 0,
      processing: counts.processing ?? 0,
      deadLettered: counts.dead_lettered ?? 0,
    };
  }, [jobsQuery.data]);

  const lastUpdatedLabel = useMemo(() => {
    if (!jobsQuery.dataUpdatedAt) {
      return 'Waiting for initial load';
    }

    return new Intl.DateTimeFormat('en', {
      timeStyle: 'medium',
    }).format(new Date(jobsQuery.dataUpdatedAt));
  }, [jobsQuery.dataUpdatedAt]);

  return (
    <div className="min-h-screen bg-shell text-white">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <header className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-card/75 px-8 py-10 shadow-glow backdrop-blur">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(53,195,169,0.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(244,162,97,0.12),transparent_28%)]" />
          <div className="relative grid gap-8 xl:grid-cols-[1.35fr,0.9fr]">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-accent">
                Distributed Job Queue System
              </div>
              <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl">
                Monitor asynchronous jobs across the API, Redis queue, and worker fleet.
              </h1>
              <p className="mt-4 max-w-3xl text-base text-slate-300">
                This dashboard surfaces queue health, retry behavior, dead-lettered
                jobs, and detailed execution logs for a production-style background
                processing system.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {['Express API', 'Redis + BullMQ', 'PostgreSQL + Prisma', 'Scalable Workers'].map(
                  (label) => (
                    <span
                      key={label}
                      className="rounded-full border border-white/10 bg-shell/40 px-4 py-2 text-xs uppercase tracking-[0.18em] text-slate-200"
                    >
                      {label}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-shell/40 p-6 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                Operational Model
              </div>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-semibold text-white">API ingestion tier</div>
                  <div className="mt-1 text-sm text-slate-400">
                    Validates requests, stores durable metadata, and hands work off to
                    the queue quickly.
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-semibold text-white">Asynchronous worker fleet</div>
                  <div className="mt-1 text-sm text-slate-400">
                    Processes jobs independently with configurable concurrency, retries,
                    and dead-letter routing.
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-semibold text-white">Observable job history</div>
                  <div className="mt-1 text-sm text-slate-400">
                    PostgreSQL-backed state and logs keep the system explainable after
                    execution finishes.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Jobs" value={summary.total} accent="text-white" />
          <MetricCard label="Queued" value={summary.queued} accent="text-cyan-200" />
          <MetricCard
            label="Processing"
            value={summary.processing}
            accent="text-emerald-200"
          />
          <MetricCard
            label="Dead Lettered"
            value={summary.deadLettered}
            accent="text-rose-200"
          />
        </section>

        <section className="mt-8 grid gap-4 xl:grid-cols-3">
          <div className="rounded-[1.75rem] border border-white/10 bg-card/70 p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
              Distributed Ingestion
            </div>
            <h2 className="mt-3 text-lg font-semibold text-white">
              HTTP requests are decoupled from job execution.
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              The API records the job immediately and pushes work onto Redis-backed
              queues so response latency stays predictable.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-card/70 p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
              Retry Control
            </div>
            <h2 className="mt-3 text-lg font-semibold text-white">
              Automatic retries surface as real system state.
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Failed attempts move through `retrying` before eventually reaching either
              `completed` or `dead_lettered`.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-card/70 p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
              Observability
            </div>
            <h2 className="mt-3 text-lg font-semibold text-white">
              State, logs, and errors stay visible after processing.
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              The UI is built like an internal operations console, making failures and
              retry behavior easy to inspect during demos.
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-card/70 p-6 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                Filters
              </div>
              <p className="mt-2 text-sm text-slate-300">
                Narrow the job stream by status or job type, then inspect a record for
                payloads, results, retries, and logs.
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                Auto-refresh every 5 seconds · Last updated {lastUpdatedLabel}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as JobStatus | typeof allStatusValue)
                }
                className="rounded-full border border-white/10 bg-shell/70 px-4 py-3 text-sm text-white outline-none ring-0 transition focus:border-accent"
              >
                <option value={allStatusValue}>All statuses</option>
                {jobStatuses.map((status) => (
                  <option key={status} value={status}>
                    {toTitleCase(status)}
                  </option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as JobType | typeof allTypeValue)
                }
                className="rounded-full border border-white/10 bg-shell/70 px-4 py-3 text-sm text-white outline-none ring-0 transition focus:border-accent"
              >
                <option value={allTypeValue}>All job types</option>
                {jobTypes.map((type) => (
                  <option key={type} value={type}>
                    {toTitleCase(type)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => jobsQuery.refetch()}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-shell/70 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-accent hover:text-white"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {jobsQuery.error ? (
          <section className="mt-8 rounded-[2rem] border border-red-500/20 bg-red-500/10 p-6">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 h-5 w-5 text-red-200" />
              <div>
                <p className="font-semibold text-red-100">Dashboard data failed to load</p>
                <p className="mt-2 text-sm text-red-100/80">
                  {(jobsQuery.error as Error).message}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-8">
          <JobsTable
            jobs={jobsQuery.data?.items ?? []}
            selectedJobId={selectedJobId}
            loading={jobsQuery.isLoading}
            onSelect={(jobId) => setSelectedJobId(jobId)}
          />
        </section>
      </div>

      <JobDrawer
        job={selectedJobQuery.data}
        logs={selectedJobLogsQuery.data}
        onClose={() => setSelectedJobId(undefined)}
        onRetry={() => {
          if (selectedJobId) {
            retryMutation.mutate(selectedJobId);
          }
        }}
        onDelete={() => {
          if (selectedJobId) {
            deleteMutation.mutate(selectedJobId);
          }
        }}
        retrying={retryMutation.isPending}
        deleting={deleteMutation.isPending}
      />
    </div>
  );
}
