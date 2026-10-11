import { describe, it, expect } from 'vitest';
import { jobSchema, signUpSchema, applicationSchema, phoneSchema } from './schemas.js';
import { canApply, isExpired, profileCompletion } from './format.js';

describe('jobSchema', () => {
  const valid = {
    title: 'Cotton Picking',
    category: 'Picking' as const,
    description: 'Need workers for cotton picking across 5 acres.',
    workers_needed: 12,
    start_date: '2026-08-01',
    end_date: '2026-08-20',
    wage: 450,
    wage_unit: 'day' as const,
    state: 'Karnataka' as const,
    district: 'Dharwad',
    locality: 'Hubli Taluk',
  };

  it('accepts a valid job', () => {
    expect(jobSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects end date before start date', () => {
    const r = jobSchema.safeParse({ ...valid, end_date: '2026-07-01' });
    expect(r.success).toBe(false);
  });

  it('rejects non-positive / non-integer worker count', () => {
    expect(jobSchema.safeParse({ ...valid, workers_needed: 0 }).success).toBe(false);
    expect(jobSchema.safeParse({ ...valid, workers_needed: 2.5 }).success).toBe(false);
  });

  it('rejects negative wage', () => {
    expect(jobSchema.safeParse({ ...valid, wage: -1 }).success).toBe(false);
  });
});

describe('signUpSchema', () => {
  it('rejects mismatched passwords', () => {
    const r = signUpSchema.safeParse({
      full_name: 'Demo User',
      email: 'demo@example.com',
      password: 'secret1',
      confirm_password: 'secret2',
      role: 'farmer',
    });
    expect(r.success).toBe(false);
  });
});

describe('phoneSchema', () => {
  it('accepts valid Indian numbers', () => {
    expect(phoneSchema.safeParse('9876543210').success).toBe(true);
    expect(phoneSchema.safeParse('+919876543210').success).toBe(true);
  });
  it('rejects invalid numbers', () => {
    expect(phoneSchema.safeParse('12345').success).toBe(false);
    expect(phoneSchema.safeParse('1234567890').success).toBe(false); // cannot start with 1
  });
});

describe('canApply', () => {
  const future = '2099-01-01';
  it('allows applying to an open, future job not yet applied', () => {
    expect(canApply('open', future, false).ok).toBe(true);
  });
  it('blocks duplicate applications', () => {
    expect(canApply('open', future, true).ok).toBe(false);
  });
  it('blocks closed/filled jobs', () => {
    expect(canApply('closed', future, false).ok).toBe(false);
    expect(canApply('filled', future, false).ok).toBe(false);
  });
  it('blocks expired jobs', () => {
    expect(canApply('open', '2000-01-01', false).ok).toBe(false);
  });
});

describe('isExpired / profileCompletion', () => {
  it('detects expiry', () => {
    expect(isExpired('2000-01-01')).toBe(true);
    expect(isExpired('2099-01-01')).toBe(false);
  });
  it('computes completion percent', () => {
    expect(profileCompletion(['a', '', [], null])).toBe(25);
    expect(profileCompletion(['a', 'b'])).toBe(100);
    expect(profileCompletion([])).toBe(0);
  });
});

describe('applicationSchema', () => {
  it('requires a uuid job_id', () => {
    expect(applicationSchema.safeParse({ job_id: 'not-a-uuid' }).success).toBe(false);
    expect(
      applicationSchema.safeParse({ job_id: '11111111-1111-1111-1111-111111111111' }).success,
    ).toBe(true);
  });
});
