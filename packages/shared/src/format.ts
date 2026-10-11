/**
 * Small formatting + domain helpers shared across apps.
 */
import { CURRENCY_SYMBOL, type WageUnit } from './constants.js';

export function formatWage(amount: number, unit: WageUnit = 'day'): string {
  const unitLabel: Record<WageUnit, string> = {
    day: '/day',
    hour: '/hr',
    task: '/task',
    month: '/month',
  };
  return `${CURRENCY_SYMBOL}${amount.toLocaleString('en-IN')}${unitLabel[unit]}`;
}

export function formatDateRange(start: string, end: string): string {
  if (start === end) return start;
  return `${start} → ${end}`;
}

/** Is the job past its end date (treat as effectively expired)? */
export function isExpired(endDateISO: string, now: Date = new Date()): boolean {
  const end = new Date(`${endDateISO}T23:59:59`);
  return end.getTime() < now.getTime();
}

/** Can a labourer apply to this job right now? */
export function canApply(
  status: string,
  endDateISO: string,
  alreadyApplied: boolean,
  now: Date = new Date(),
): { ok: boolean; reason?: string } {
  if (alreadyApplied) return { ok: false, reason: 'You have already applied to this job' };
  if (status !== 'open') return { ok: false, reason: `This job is ${status} and not accepting applications` };
  if (isExpired(endDateISO, now)) return { ok: false, reason: 'This job has expired' };
  return { ok: true };
}

/** Profile completion percentage for the labourer dashboard indicator. */
export function profileCompletion(fields: Array<unknown>): number {
  if (fields.length === 0) return 0;
  const filled = fields.filter((f) => {
    if (f == null) return false;
    if (typeof f === 'string') return f.trim().length > 0;
    if (Array.isArray(f)) return f.length > 0;
    return true;
  }).length;
  return Math.round((filled / fields.length) * 100);
}

/** Time-of-day greeting (deterministic, no external service). */
export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}
