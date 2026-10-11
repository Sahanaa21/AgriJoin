import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  CalendarDays,
  Users,
  MapPin,
  Navigation,
  IndianRupee,
  Leaf,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import { canApply, formatDistance, formatWage, type JobApplication, type JobWithFarmer } from '@agrijoin/shared';
import { useAuth } from '../context/AuthContext';
import {
  applyToJob,
  getJobWithFarmer,
  getMyApplicationForJob,
  getOrCreateConversation,
} from '../lib/queries';
import { useGeolocation } from '../hooks/useGeolocation';
import { JobStatusBadge, ApplicationStatusBadge, Alert, ErrorState, Spinner } from '../components/ui';

function DetailRow({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="h-5 w-5 text-brand-green" />
      <div>
        <p className="text-xs text-brand-muted">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export default function JobDetails() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const geo = useGeolocation();

  const [job, setJob] = useState<JobWithFarmer | null>(null);
  const [myApp, setMyApp] = useState<JobApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const j = await getJobWithFarmer(id, geo.coords);
      setJob(j);
      if (j && user && profile?.role === 'labourer') {
        setMyApp(await getMyApplicationForJob(id, user.id));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load job');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [id, user?.id, geo.coords]);

  if (loading) return <Spinner label="Loading job…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!job) return <Alert tone="warning">This job could not be found.</Alert>;

  const isOwner = user?.id === job.farmer_id;
  const isLabourer = profile?.role === 'labourer';
  const applyState = canApply(job.status, job.end_date, Boolean(myApp));
  const distance = formatDistance(job.distance_km);

  async function handleApply() {
    if (!id) return;
    setApplying(true);
    setActionError(null);
    try {
      const app = await applyToJob(id, message.trim() || undefined);
      setMyApp(app);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not submit application');
    } finally {
      setApplying(false);
    }
  }

  async function handleMessageFarmer() {
    if (!job) return;
    try {
      const convId = await getOrCreateConversation(job.farmer_id, job.id);
      navigate(`/app/messages/${convId}`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not open conversation');
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Header */}
      <div className="aj-card overflow-hidden">
        <div className="bg-gradient-to-br from-brand-accent to-[#c85f20] p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{job.title}</h1>
              <p className="text-white/90">{job.category}</p>
            </div>
            <JobStatusBadge status={job.status} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1">
              <IndianRupee className="h-4 w-4" /> {formatWage(job.wage, job.wage_unit)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {job.district}
            </span>
            {distance && (
              <span className="inline-flex items-center gap-1">
                <Navigation className="h-4 w-4" /> {distance}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Farmer */}
      <div className="aj-card p-4">
        <h2 className="mb-1 text-sm font-semibold text-brand-text">Farm Details</h2>
        <div className="flex items-center gap-3 py-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-light text-brand-green">
            <Leaf className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium">{job.farmer_name}</p>
            <p className="text-xs text-brand-muted">
              {job.farmer_village ? `${job.farmer_village}, ` : ''}
              {job.farmer_district}, {job.farmer_state}
            </p>
          </div>
        </div>
      </div>

      {/* Job details */}
      <div className="aj-card p-4">
        <h2 className="mb-2 text-sm font-semibold text-brand-text">Job Details</h2>
        <p className="whitespace-pre-wrap text-sm text-brand-text">{job.description}</p>
        <div className="mt-3 divide-y divide-brand-border">
          <DetailRow icon={CalendarDays} label="Start date" value={job.start_date} />
          <DetailRow icon={CalendarDays} label="End date" value={job.end_date} />
          <DetailRow icon={Users} label="Workers needed" value={`${job.accepted_count ?? 0}/${job.workers_needed} filled`} />
          <DetailRow icon={MapPin} label="Location" value={`${job.locality}, ${job.district}, ${job.state}`} />
          <DetailRow icon={IndianRupee} label="Wage" value={formatWage(job.wage, job.wage_unit)} />
          {job.crop && <DetailRow icon={Leaf} label="Crop" value={job.crop} />}
        </div>
        {job.requirements && (
          <div className="mt-3 rounded-xl bg-brand-light/60 p-3">
            <p className="text-xs font-semibold text-brand-deep">Requirements</p>
            <p className="text-sm text-brand-text">{job.requirements}</p>
          </div>
        )}
      </div>

      {!geo.coords && (job.lat != null) && (
        <button className="inline-flex items-center gap-2 text-sm text-brand-green" onClick={geo.request}>
          <MapPin className="h-4 w-4" /> Enable location to see distance
        </button>
      )}

      {actionError && <Alert tone="error">{actionError}</Alert>}

      {/* Actions */}
      {isOwner ? (
        <div className="flex flex-wrap gap-3">
          <Link to="/app/applications" className="aj-btn-primary flex-1">
            Review applications
          </Link>
          <Link to={`/app/jobs/${job.id}/edit`} className="aj-btn-ghost">
            Edit job
          </Link>
        </div>
      ) : isLabourer ? (
        myApp ? (
          <div className="aj-card flex items-center justify-between p-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Application submitted
            </div>
            <ApplicationStatusBadge status={myApp.status} />
          </div>
        ) : applyState.ok ? (
          <div className="aj-card space-y-3 p-4">
            <label className="aj-label">Message to the farmer <span className="font-normal text-brand-muted">(optional)</span></label>
            <textarea
              className="aj-input"
              placeholder="Introduce yourself or mention your availability…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="flex gap-3">
              <button className="aj-btn-primary flex-1" onClick={handleApply} disabled={applying}>
                {applying ? 'Submitting…' : 'Apply Now'}
              </button>
              <button className="aj-btn-ghost" onClick={handleMessageFarmer}>
                <MessageSquare className="h-4 w-4" /> Message
              </button>
            </div>
          </div>
        ) : (
          <Alert tone="warning">{applyState.reason}</Alert>
        )
      ) : null}
    </div>
  );
}
