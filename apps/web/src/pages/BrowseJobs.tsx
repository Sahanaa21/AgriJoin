import { useCallback, useEffect, useState } from 'react';
import { Search, SlidersHorizontal, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  WORK_CATEGORIES,
  STATES,
  JOB_SORTS,
  type JobFilter,
  type JobSort,
  type JobWithFarmer,
  type LabourerProfile,
} from '@agrijoin/shared';
import { useAuth } from '../context/AuthContext';
import { getLabourerProfile, listOpenJobs } from '../lib/queries';
import { useGeolocation } from '../hooks/useGeolocation';
import { JobCard } from '../components/JobCard';
import { EmptyState, ErrorState, Spinner } from '../components/ui';

const SORT_LABELS: Record<JobSort, string> = {
  recent: 'Recently posted',
  nearest: 'Nearest',
  highest_wage: 'Highest wage',
  starting_soon: 'Starting soon',
  best_match: 'Best match',
};

const PAGE_SIZE = 9;

export default function BrowseJobs() {
  const { user } = useAuth();
  const geo = useGeolocation();
  const [labProfile, setLabProfile] = useState<LabourerProfile | null>(null);

  const [filter, setFilter] = useState<Partial<JobFilter>>({ sort: 'recent', page: 1, page_size: PAGE_SIZE });
  const [rows, setRows] = useState<JobWithFarmer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (user) getLabourerProfile(user.id).then(setLabProfile).catch(() => {});
  }, [user?.id]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { rows, total } = await listOpenJobs(
        filter,
        geo.coords,
        labProfile ? { skills: labProfile.skills, work_preferences: labProfile.work_preferences, expected_wage: labProfile.expected_wage } : null,
      );
      setRows(rows);
      setTotal(total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [filter, geo.coords, labProfile]);

  useEffect(() => {
    void load();
  }, [load]);

  const set = (patch: Partial<JobFilter>) => setFilter((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const needsLocationNote = (filter.sort === 'nearest' || filter.sort === 'best_match') && !geo.coords;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-text">Browse Jobs</h1>
        <button className="aj-btn-ghost" onClick={() => setShowFilters((v) => !v)}>
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
          <input className="aj-input pl-9" placeholder="Search jobs…" value={filter.q ?? ''} onChange={(e) => set({ q: e.target.value })} />
        </div>
        <select className="aj-input w-auto" value={filter.sort} onChange={(e) => set({ sort: e.target.value as JobSort })}>
          {JOB_SORTS.map((s) => (
            <option key={s} value={s}>
              {SORT_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {showFilters && (
        <div className="aj-card grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="aj-label">Category</label>
            <select className="aj-input" value={filter.category ?? ''} onChange={(e) => set({ category: (e.target.value || undefined) as JobFilter['category'] })}>
              <option value="">All</option>
              {WORK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="aj-label">State</label>
            <select className="aj-input" value={filter.state ?? ''} onChange={(e) => set({ state: (e.target.value || undefined) as JobFilter['state'] })}>
              <option value="">All</option>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="aj-label">District</label>
            <input className="aj-input" placeholder="e.g. Mysuru" value={filter.district ?? ''} onChange={(e) => set({ district: e.target.value || undefined })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="aj-label">Min ₹</label>
              <input type="number" min="0" className="aj-input" value={filter.min_wage ?? ''} onChange={(e) => set({ min_wage: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <label className="aj-label">Max ₹</label>
              <input type="number" min="0" className="aj-input" value={filter.max_wage ?? ''} onChange={(e) => set({ max_wage: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
          </div>
        </div>
      )}

      {!geo.coords && (
        <button className="inline-flex items-center gap-2 text-sm text-brand-green" onClick={geo.request}>
          <MapPin className="h-4 w-4" /> Enable location to see distances {needsLocationNote && '(required for this sort)'}
        </button>
      )}
      {geo.status === 'denied' && (
        <p className="text-sm text-amber-700">Location denied — jobs still show, but without distances.</p>
      )}

      {loading ? (
        <Spinner label="Finding jobs…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyState title="No open jobs found" description="Try widening your filters or changing the sort order." />
      ) : (
        <>
          <p className="text-sm text-brand-muted">{total} open job{total === 1 ? '' : 's'}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button className="aj-btn-ghost px-3 py-1.5" disabled={(filter.page ?? 1) <= 1} onClick={() => set({ page: (filter.page ?? 1) - 1 })}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <span className="text-sm text-brand-muted">
              Page {filter.page ?? 1} of {totalPages}
            </span>
            <button className="aj-btn-ghost px-3 py-1.5" disabled={(filter.page ?? 1) >= totalPages} onClick={() => set({ page: (filter.page ?? 1) + 1 })}>
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
