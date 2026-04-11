import { JobLogRecord, JobRecord, JobsPayload, JobStatus, JobType } from '../types';

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:4000';

interface ApiEnvelope<T> {
  data: T;
}

interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

const request = async <T>(path: string, init?: globalThis.RequestInit) => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json()) as ApiEnvelope<T> | ApiErrorEnvelope;
  if (!response.ok) {
    throw new Error(
      'error' in payload ? payload.error.message : 'Request failed unexpectedly',
    );
  }

  return (payload as ApiEnvelope<T>).data;
};

export const api = {
  listJobs: (filters: {
    status: JobStatus | undefined;
    type: JobType | undefined;
  }) => {
    const params = new URLSearchParams();
    if (filters.status) {
      params.set('status', filters.status);
    }
    if (filters.type) {
      params.set('type', filters.type);
    }
    params.set('limit', '20');
    return request<JobsPayload>(`/api/jobs?${params.toString()}`);
  },
  getJob: (jobId: string) => request<JobRecord>(`/api/jobs/${jobId}`),
  getJobLogs: (jobId: string) => request<JobLogRecord[]>(`/api/jobs/${jobId}/logs`),
  retryJob: (jobId: string) =>
    request<{ id: string; status: JobStatus; updatedAt: string }>(
      `/api/jobs/${jobId}/retry`,
      {
        method: 'POST',
      },
    ),
  deleteJob: (jobId: string) =>
    request<void>(`/api/jobs/${jobId}`, {
      method: 'DELETE',
    }),
};
