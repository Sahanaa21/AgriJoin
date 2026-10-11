import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search } from 'lucide-react';
import { JOB_STATUSES, formatWage, type JobWithFarmer } from '@agrijoin/shared';
import { useAuth } from '../context/AuthContext';
import { listMyJobs, setJobStatus } from '../lib/queries';
import { JobStatusBadge, EmptyState, ErrorState, Spinner, Alert } from '../components/ui';

const STATUS_ACTIONS: Record<string, { label: string; next: string }[]> = {
  open: [
    { label: 'Pause', next: 'paused' },
    { label: 'Mark filled', next: 'filled' },
    { label: 'Close', next: 'closed' },
  ],
  paused: [
    { label: 'Reopen', next: 'open' },
    { label: 'Close', next: 'closed' },
  ],
  filled: [
    { label: 'Reopen', next: 'open' },
    { label: 'Close', next: 'closed' },
  ],
  closed: [{ label: 'Reopen', next: 'open' }],
};

export default function ManageJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobWithFarmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setJobs(await listMyJobs(user.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [user?.id]);

  const filtered = useMemo(() => {
    return jobs.filter(
      (j) =>
        (statusFilter === 'all' || j.status === statusFilter) &&
        (q.trim() === '' || j.title.toLowerCase().includes(q.toLowerCase())),
    );
  }, [jobs, statusFilter, q]);

  async function changeStatus(jobId: string, next: string) {
    setBusyId(jobId);
    setActionError(null);
    try {
      const updated = await setJobStatus(jobId, next);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: updated.status } : j)));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update status');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Spinner label="Loading your jobs…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-text">Manage Jobs</h1>
        <Link to="/app/jobs/new" className="aj-btn-primary">
          <PlusCircle className="h-4 w-4" /> Post Job
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
          <input className="aj-input pl-9" placeholder="Search my jobs…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="aj-input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </select>
      </div>

      {actionError && <Alert tone="error">{actionError}</Alert>}

      {filtered.length === 0 ? (
        <EmptyState
          title="No jobs match"
          description={jobs.length === 0 ? 'Post your first job to get started.' : 'Try a different search or filter.'}
          action={
            jobs.length === 0 ? (
              <Link to="/app/jobs/new" className="aj-btn-primary">
                Post a job
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((j) => (
            <div key={j.id} className="aj-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{j.title}</h3>
                    <JobStatusBadge status={j.status} />
                  </div>
                  <p className="text-sm text-brand-muted">
                    {j.category} · {formatWage(j.wage, j.wage_unit)} · {j.locality}, {j.district}
                  </p>
                  <p className="mt-1 text-xs text-brand-muted">
                    {j.accepted_count ?? 0}/{j.workers_needed} filled · {j.start_date} → {j.end_date}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/app/jobs/${j.id}`} className="aj-btn-ghost px-3 py-1.5 text-xs">
                    View
                  </Link>
                  <Link to={`/app/jobs/${j.id}/edit`} className="aj-btn-ghost px-3 py-1.5 text-xs">
                    Edit
                  </Link>
                  {STATUS_ACTIONS[j.status]?.map((a) => (
                    <button
                      key={a.next}
                      className="aj-btn-ghost px-3 py-1.5 text-xs"
                      disabled={busyId === j.id}
                      onClick={() => changeStatus(j.id, a.next)}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
