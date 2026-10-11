import { describe, it, expect } from 'vitest';
import { matchScore, MATCH_WEIGHTS } from './matching.js';

const now = Date.parse('2026-10-12T12:00:00Z');

describe('matchScore', () => {
  it('weights sum to 1.0', () => {
    const sum = Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  it('is deterministic for identical inputs', () => {
    const job = { category: 'Harvesting', crop: 'Rice', wage: 500, created_at: '2026-10-11T12:00:00Z' };
    const lab = { skills: ['Rice Harvesting'], expected_wage: 500 };
    expect(matchScore(job, lab, now)).toEqual(matchScore(job, lab, now));
  });

  it('rewards skill overlap', () => {
    const job = { category: 'Harvesting', crop: 'Rice', wage: 500, created_at: '2026-10-11T12:00:00Z' };
    const matched = matchScore(job, { skills: ['Rice Harvesting'] }, now);
    const unmatched = matchScore(job, { skills: ['Tractor Operation'] }, now);
    expect(matched.skillRelevance).toBeGreaterThan(unmatched.skillRelevance);
    expect(matched.score).toBeGreaterThan(unmatched.score);
  });

  it('rewards nearer jobs and gives neutral score when distance unknown', () => {
    const base = { category: 'Picking', wage: 400, created_at: '2026-10-11T12:00:00Z' };
    const lab = { skills: ['Cotton Picking'], coords: { lat: 12.97, lng: 77.59 } };
    const near = matchScore({ ...base, coords: { lat: 12.98, lng: 77.6 } }, lab, now);
    const far = matchScore({ ...base, coords: { lat: 15.5, lng: 75.0 } }, lab, now);
    const unknown = matchScore({ ...base, coords: null }, lab, now);
    expect(near.proximity).toBeGreaterThan(far.proximity);
    expect(unknown.proximity).toBe(0.5);
  });

  it('produces a 0..100 score', () => {
    const s = matchScore(
      { category: 'Harvesting', crop: 'Rice', wage: 2000, created_at: '2026-10-12T11:00:00Z', coords: { lat: 12.97, lng: 77.59 } },
      { skills: ['Rice Harvesting'], expected_wage: 500, coords: { lat: 12.97, lng: 77.59 } },
      now,
    );
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(100);
  });
});
