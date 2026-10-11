import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  Briefcase,
  ClipboardList,
  Map as MapIcon,
  MessageSquare,
  User,
  Search,
} from 'lucide-react';
import {
  greeting,
  profileCompletion,
  type ApplicationWithRelations,
  type JobWithFarmer,
  type LabourerProfile,
} from '@agrijoin/shared';
import { useAuth } from '../context/AuthContext';
import {
  getFarmerStats,
  getLabourerStats,
  getLabourerProfile,
  listApplicationsForMyJobs,
  listMyApplications,
  listMyJobs,
  listOpenJobs,
  type FarmerStats,
  type LabourerStats,
} from '../lib/queries';
import { JobCard } from '../components/JobCard';
import { ApplicationStatusBadge, Alert, EmptyState, ErrorState, Spinner } from '../components/ui';

function StatCard({ label, value, tone = 'green' }: { label: string; value: number | string; tone?: 'green' | 'accent' | 'muted' }) {
  const tones = {
    green: 'text-brand-green',
    accent: 'text-brand-accent',
    muted: 'text-brand-text',
  } as const;
  return (
    <div className="aj-card p-4">
      <p className={`text-2xl font-extrabold ${tones[tone]}`}>{value}</p>
      <p className="text-sm text-brand-muted">{label}</p>
    </div>
  );
}

const QUICK: Record<string, { to: string; label: string; icon: typeof PlusCircle }[]> = {
  farmer: [
    { to: '/app/jobs/new', label: 'Post Job', icon: PlusCircle },
    { to: '/app/jobs', label: 'Manage Jobs', icon: Briefcase },
    { to: '/app/applications', label: 'Applications', icon: ClipboardList },
    { to: '/app/map', label: 'View Map', icon: MapIcon },
    { to: '/app/messages', label: 'Messages', icon: MessageSquare },
    { to: '/app/profile', label: 'Edit Profile', icon: User },
  ],
  labourer: [
    { to: '/app/browse', label: 'Browse Jobs', icon: Search },
    { to: '/app/applications', label: 'My Applications', icon: ClipboardList },
    { to: '/app/map', label: 'Live Map', icon: MapIcon },
    { to: '/app/messages', label: 'Messages', icon: MessageSquare },
    { to: '/app/profile', label: 'Edit Profile', icon: User },
  ],
};

function QuickActions({ role }: { role: 'farmer' | 'labourer' }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-brand-text">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {QUICK[role].map((q) => (
          <Link key={q.to} to={q.to} className="aj-card flex flex-col items-center gap-2 p-4 text-center hover:shadow-lift">
            <q.icon className="h-6 w-6 text-brand-green" />
            <span className="text-sm font-medium">{q.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();
  if (!profile) return <Spinner />;
  return profile.role === 'farmer' ? <FarmerDashboard /> : <LabourerDashboard />;
}

function FarmerDashboard() {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState<FarmerStats | null>(null);
  const [jobs, setJobs] = useState<JobWithFarmer[]>([]);
  const [apps, setApps] = useState<ApplicationWithRelations[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [s, j] = await Promise.all([getFarmerStats(user.id), listMyJobs(user.id)]);
      setStats(s);
      setJobs(j.slice(0, 3));
      // recent applications across my jobs
      setApps((await listApplicationsForMyJobs(user.id)).slice(0, 4));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [user?.id]);

  if (loading) return <Spinner label="Loading your dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="aj-card bg-gradient-to-br from-brand-green to-brand-deep p-5 text-white">
        <p className="text-sm text-white/80">{greeting()},</p>
        <h1 className="text-2xl font-bold">{profile?.full_name}</h1>
        <p className="text-sm text-white/80">
          {profile?.village ? `${profile.village}, ` : ''}
          {profile?.district}, {profile?.state}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Active jobs" value={stats?.activeJobs ?? 0} />
        <StatCard label="Applications" value={stats?.totalApplications ?? 0} tone="accent" />
        <StatCard label="Pending" value={stats?.pendingApplications ?? 0} tone="muted" />
      </div>

      <QuickActions role="farmer" />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-text">Recent jobs</h2>
          <Link to="/app/jobs" className="text-sm text-brand-green">
            See all
          </Link>
        </div>
        {jobs.length === 0 ? (
          <EmptyState
            title="No jobs posted yet"
            description="Post your first agricultural job to start receiving applications."
            action={
              <Link to="/app/jobs/new" className="aj-btn-primary">
                <PlusCircle className="h-4 w-4" /> Post a job
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-brand-text">Recent applications</h2>
        {apps.length === 0 ? (
          <Alert tone="info">No applications yet. They'll appear here as labourers apply.</Alert>
        ) : (
          <div className="aj-card divide-y divide-brand-border">
            {apps.map((a) => (
              <Link key={a.id} to="/app/applications" className="flex items-center justify-between gap-3 p-3 hover:bg-brand-light/40">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.labourer?.full_name ?? 'Labourer'}</p>
                  <p className="truncate text-xs text-brand-muted">{a.job?.title}</p>
                </div>
                <ApplicationStatusBadge status={a.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LabourerDashboard() {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState<LabourerStats | null>(null);
  const [labProfile, setLabProfile] = useState<LabourerProfile | null>(null);
  const [nearby, setNearby] = useState<JobWithFarmer[]>([]);
  const [apps, setApps] = useState<ApplicationWithRelations[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [s, lp, open, myApps] = await Promise.all([
        getLabourerStats(user.id),
        getLabourerProfile(user.id),
        listOpenJobs({ page: 1, page_size: 4, sort: 'recent' }),
        listMyApplications(user.id),
      ]);
      setStats(s);
      setLabProfile(lp);
      setNearby(open.rows);
      setApps(myApps.slice(0, 4));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [user?.id]);

  if (loading) return <Spinner label="Loading your dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const completion = profileCompletion([
    profile?.full_name,
    profile?.state,
    profile?.district,
    profile?.village,
    labProfile?.skills ?? [],
    labProfile?.expected_wage,
  ]);

  return (
    <div className="space-y-6">
      <div className="aj-card bg-gradient-to-br from-brand-accent to-[#c85f20] p-5 text-white">
        <p className="text-sm text-white/80">{greeting()},</p>
        <h1 className="text-2xl font-bold">{profile?.full_name}</h1>
        <p className="text-sm text-white/80">
          {profile?.district}, {profile?.state}
        </p>
        {labProfile?.expected_wage != null && (
          <span className="mt-2 inline-block rounded-full bg-white/20 px-3 py-1 text-sm">
            Expected ₹{labProfile.expected_wage}/day
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Applied" value={stats?.applied ?? 0} />
        <StatCard label="Accepted" value={stats?.accepted ?? 0} tone="accent" />
        <StatCard label="Profile" value={`${completion}%`} tone="muted" />
      </div>

      {completion < 100 && (
        <Alert tone="info">
          Your profile is {completion}% complete.{' '}
          <Link to="/app/profile" className="font-semibold underline">
            Finish it
          </Link>{' '}
          to get better job matches.
        </Alert>
      )}

      <QuickActions role="labourer" />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-text">Nearby jobs</h2>
          <Link to="/app/browse" className="text-sm text-brand-green">
            See all
          </Link>
        </div>
        {nearby.length === 0 ? (
          <EmptyState title="No open jobs right now" description="Check back soon or adjust your filters in Browse Jobs." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {nearby.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-brand-text">Recent applications</h2>
        {apps.length === 0 ? (
          <Alert tone="info">You haven't applied to any jobs yet.</Alert>
        ) : (
          <div className="aj-card divide-y divide-brand-border">
            {apps.map((a) => (
              <Link key={a.id} to="/app/applications" className="flex items-center justify-between gap-3 p-3 hover:bg-brand-light/40">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.job?.title ?? 'Job'}</p>
                  <p className="truncate text-xs text-brand-muted">
                    {a.job?.district} · ₹{a.job?.wage}/day
                  </p>
                </div>
                <ApplicationStatusBadge status={a.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
