import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, MapPin, IndianRupee, MessageSquare } from 'lucide-react';
import type { ApplicationWithRelations } from '@agrijoin/shared';
import { useAuth } from '../context/AuthContext';
import {
  listApplicationsForMyJobs,
  listMyApplications,
  setApplicationStatus,
  getOrCreateConversation,
} from '../lib/queries';
import { ApplicationStatusBadge, Alert, EmptyState, ErrorState, Spinner } from '../components/ui';

export default function Applications() {
  const { profile } = useAuth();
  if (!profile) return <Spinner />;
  return profile.role === 'farmer' ? <FarmerApplications /> : <LabourerApplications />;
}

function useApplications(loader: () => Promise<ApplicationWithRelations[]>, dep: string | undefined) {
  const [apps, setApps] = useState<ApplicationWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  async function load() {
    setLoading(true);
    setError(null);
    try {
      setApps(await loader());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [dep]);
  return { apps, setApps, loading, error, reload: load };
}

function LabourerApplications() {
  const { user } = useAuth();
  const { apps, setApps, loading, error, reload } = useApplications(() => listMyApplications(user!.id), user?.id);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function withdraw(appId: string) {
    setBusy(appId);
    setActionError(null);
    try {
      const updated = await setApplicationStatus(appId, 'withdrawn');
      setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, status: updated.status } : a)));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not withdraw');
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <Spinner label="Loading your applications…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-text">
        My Applications <span className="text-base font-normal text-brand-muted">({apps.length})</span>
      </h1>
      {actionError && <Alert tone="error">{actionError}</Alert>}
      {apps.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Browse open jobs and apply to the ones that fit you."
          action={
            <Link to="/app/browse" className="aj-btn-primary">
              Browse jobs
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <div key={a.id} className="aj-card p-4">
              <div className="flex items-start justify-between gap-3">
                <Link to={a.job ? `/app/jobs/${a.job.id}` : '#'} className="min-w-0">
                  <h3 className="font-semibold">
                    {a.job?.title} <span className="font-normal text-brand-muted">— {a.job?.category}</span>
                  </h3>
                </Link>
                <ApplicationStatusBadge status={a.status} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-brand-muted">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {a.job?.district}
                </span>
                <span className="inline-flex items-center gap-1">
                  <IndianRupee className="h-4 w-4" /> ₹{a.job?.wage}/day
                </span>
                {a.job && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" /> {a.job.start_date} → {a.job.end_date}
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-brand-muted">
                Applied {new Date(a.created_at).toLocaleDateString()}
              </p>
              {(a.status === 'pending' || a.status === 'accepted') && (
                <button className="mt-3 text-sm text-red-600 underline" disabled={busy === a.id} onClick={() => withdraw(a.id)}>
                  Withdraw application
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FarmerApplications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { apps, setApps, loading, error, reload } = useApplications(() => listApplicationsForMyJobs(user!.id), user?.id);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function decide(appId: string, status: 'accepted' | 'rejected') {
    setBusy(appId);
    setActionError(null);
    try {
      const updated = await setApplicationStatus(appId, status);
      setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, status: updated.status } : a)));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update application');
    } finally {
      setBusy(null);
    }
  }

  async function messageLabourer(labourerId: string, jobId?: string) {
    try {
      const convId = await getOrCreateConversation(labourerId, jobId ?? null);
      navigate(`/app/messages/${convId}`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not open conversation');
    }
  }

  if (loading) return <Spinner label="Loading applications…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-text">
        Applications <span className="text-base font-normal text-brand-muted">({apps.length})</span>
      </h1>
      {actionError && <Alert tone="error">{actionError}</Alert>}
      {apps.length === 0 ? (
        <EmptyState title="No applications yet" description="When labourers apply to your jobs, they'll appear here." />
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <div key={a.id} className="aj-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold">{a.labourer?.full_name ?? 'Labourer'}</h3>
                  <p className="text-sm text-brand-muted">
                    for <Link className="text-brand-green" to={`/app/jobs/${a.job?.id}`}>{a.job?.title}</Link>
                    {a.labourer?.district ? ` · ${a.labourer.district}` : ''}
                  </p>
                </div>
                <ApplicationStatusBadge status={a.status} />
              </div>
              {a.message && <p className="mt-2 rounded-lg bg-brand-light/60 p-2 text-sm">{a.message}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {a.status === 'pending' && (
                  <>
                    <button className="aj-btn-primary px-3 py-1.5 text-xs" disabled={busy === a.id} onClick={() => decide(a.id, 'accepted')}>
                      Accept
                    </button>
                    <button className="aj-btn-ghost px-3 py-1.5 text-xs" disabled={busy === a.id} onClick={() => decide(a.id, 'rejected')}>
                      Reject
                    </button>
                  </>
                )}
                <button className="aj-btn-ghost px-3 py-1.5 text-xs" onClick={() => messageLabourer(a.labourer_id, a.job?.id)}>
                  <MessageSquare className="h-4 w-4" /> Message
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
