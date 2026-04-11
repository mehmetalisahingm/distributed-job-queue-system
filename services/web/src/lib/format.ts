import { JobStatus } from '../types';

export const formatDate = (value: string | null) => {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

export const toTitleCase = (value: string) =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const statusClasses: Record<JobStatus, string> = {
  pending: 'border-slate-500/40 bg-slate-500/10 text-slate-100',
  queued: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200',
  processing: 'border-teal-500/40 bg-teal-500/10 text-teal-200',
  completed: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  failed: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
  retrying: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
  dead_lettered: 'border-red-500/40 bg-red-500/10 text-red-200',
};
