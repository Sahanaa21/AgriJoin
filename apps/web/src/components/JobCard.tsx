import { Link } from 'react-router-dom';
import { MapPin, Users, CalendarDays, Navigation } from 'lucide-react';
import { formatDistance, formatWage, type JobWithFarmer } from '@agrijoin/shared';
import { JobStatusBadge } from './ui';

/**
 * Consistent job card used across Browse, Dashboard and Manage Jobs.
 * Distance is only shown when it can actually be computed from coordinates.
 */
export function JobCard({ job, to }: { job: JobWithFarmer; to?: string }) {
  const distance = formatDistance(job.distance_km);
  return (
    <Link
      to={to ?? `/app/jobs/${job.id}`}
      className="aj-card flex flex-col gap-3 p-4 transition-shadow hover:shadow-lift"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-brand-text">
            {job.title} <span className="font-normal text-brand-muted">— {job.category}</span>
          </h3>
          <p className="truncate text-sm text-brand-muted">{job.farmer_name}</p>
        </div>
        <JobStatusBadge status={job.status} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-brand-text">
        <span className="font-semibold text-brand-deep">{formatWage(job.wage, job.wage_unit)}</span>
        <span className="inline-flex items-center gap-1 text-brand-muted">
          <MapPin className="h-4 w-4" /> {job.locality}, {job.district}
        </span>
        {distance && (
          <span className="inline-flex items-center gap-1 text-brand-muted">
            <Navigation className="h-4 w-4" /> {distance}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-brand-muted">
        <span className="inline-flex items-center gap-1">
          <Users className="h-4 w-4" /> {job.workers_needed} workers
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-4 w-4" /> {job.start_date} → {job.end_date}
        </span>
      </div>
    </Link>
  );
}
