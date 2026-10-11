import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import type { ApplicationStatus, JobStatus } from '@agrijoin/shared';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-brand-muted" role="status">
      <Loader2 className="h-5 w-5 animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function Alert({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'success' | 'error' | 'warning';
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    info: 'bg-brand-light text-brand-deep border-brand-border',
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`} role="alert">
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-border bg-white/60 px-6 py-14 text-center">
      {icon && <div className="mb-3 text-brand-green">{icon}</div>}
      <h3 className="text-base font-semibold text-brand-text">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-brand-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
      <p className="text-sm font-medium text-red-700">Something went wrong</p>
      <p className="mt-1 text-sm text-red-600">{message}</p>
      {onRetry && (
        <button className="aj-btn-ghost mt-4" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

const JOB_BADGE: Record<JobStatus, string> = {
  open: 'bg-green-100 text-green-800',
  paused: 'bg-amber-100 text-amber-800',
  filled: 'bg-blue-100 text-blue-800',
  closed: 'bg-gray-200 text-gray-700',
};

const APP_BADGE: Record<ApplicationStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-200 text-gray-700',
  completed: 'bg-blue-100 text-blue-800',
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <span className={`aj-badge capitalize ${JOB_BADGE[status]}`}>{status}</span>;
}

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`aj-badge capitalize ${APP_BADGE[status]}`}>{status}</span>;
}

/** Multi-select chip group used for crops, skills, states, categories. */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  multiple = true,
}: {
  options: readonly T[];
  value: T[];
  onChange: (next: T[]) => void;
  multiple?: boolean;
}) {
  const toggle = (opt: T) => {
    if (!multiple) {
      onChange([opt]);
      return;
    }
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = value.includes(opt);
        return (
          <button
            type="button"
            key={opt}
            aria-pressed={on}
            onClick={() => toggle(opt)}
            className={`aj-chip ${on ? 'aj-chip-on' : 'aj-chip-off'}`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
