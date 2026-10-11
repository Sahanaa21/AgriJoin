/**
 * "Best match" job ranking for a labourer.
 *
 * This is a DETERMINISTIC, fully explainable score — not machine learning and
 * not "AI". Each factor is normalised to 0..1, multiplied by a fixed weight,
 * and summed. The same inputs always produce the same score. The breakdown is
 * returned so the UI can explain *why* a job ranked where it did.
 *
 * Factors (weights sum to 1.0):
 *  - skillRelevance (0.40): overlap between the labourer's skills/preferences
 *    and the job's category + crop.
 *  - proximity      (0.30): closer jobs score higher, within a 50 km horizon.
 *  - wage           (0.20): higher wage scores higher, scaled against the
 *    labourer's expected wage (or a ₹1000/day reference if none set).
 *  - recency        (0.10): newer postings score slightly higher (14-day window).
 */

import { haversineKm, type LatLng } from './distance.js';

export const MATCH_WEIGHTS = {
  skillRelevance: 0.4,
  proximity: 0.3,
  wage: 0.2,
  recency: 0.1,
} as const;

const PROXIMITY_HORIZON_KM = 50;
const RECENCY_WINDOW_DAYS = 14;
const WAGE_REFERENCE = 1000; // ₹/day reference when the labourer has no expected wage

export interface MatchJobInput {
  category: string;
  crop?: string | null;
  wage: number;
  created_at: string; // ISO timestamp
  coords?: LatLng | null;
}

export interface MatchLabourerInput {
  skills: string[];
  work_preferences?: string[];
  expected_wage?: number | null;
  coords?: LatLng | null;
}

export interface MatchBreakdown {
  skillRelevance: number;
  proximity: number;
  wage: number;
  recency: number;
  score: number; // 0..100
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Normalise a skill/category label for loose comparison. */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

function skillRelevance(job: MatchJobInput, lab: MatchLabourerInput): number {
  const haystack = [...lab.skills, ...(lab.work_preferences ?? [])].map(norm);
  if (haystack.length === 0) return 0;
  const targets = [job.category, job.crop ?? ''].filter(Boolean).map(norm);
  if (targets.length === 0) return 0;

  let hits = 0;
  for (const t of targets) {
    if (haystack.some((h) => h.includes(t) || t.includes(h))) hits += 1;
  }
  return clamp01(hits / targets.length);
}

function proximityScore(job: MatchJobInput, lab: MatchLabourerInput): number {
  const km = haversineKm(lab.coords, job.coords);
  if (km == null) return 0.5; // unknown distance → neutral, don't penalise
  return clamp01(1 - km / PROXIMITY_HORIZON_KM);
}

function wageScore(job: MatchJobInput, lab: MatchLabourerInput): number {
  const ref = lab.expected_wage && lab.expected_wage > 0 ? lab.expected_wage : WAGE_REFERENCE;
  // At the reference wage → 0.5; double the reference → 1.0; zero → 0.
  return clamp01(job.wage / (ref * 2));
}

function recencyScore(job: MatchJobInput, now: number): number {
  const posted = Date.parse(job.created_at);
  if (Number.isNaN(posted)) return 0;
  const ageDays = (now - posted) / (1000 * 60 * 60 * 24);
  return clamp01(1 - ageDays / RECENCY_WINDOW_DAYS);
}

export function matchScore(
  job: MatchJobInput,
  lab: MatchLabourerInput,
  now: number = Date.now(),
): MatchBreakdown {
  const skill = skillRelevance(job, lab);
  const prox = proximityScore(job, lab);
  const wage = wageScore(job, lab);
  const recency = recencyScore(job, now);

  const score =
    skill * MATCH_WEIGHTS.skillRelevance +
    prox * MATCH_WEIGHTS.proximity +
    wage * MATCH_WEIGHTS.wage +
    recency * MATCH_WEIGHTS.recency;

  return {
    skillRelevance: skill,
    proximity: prox,
    wage,
    recency,
    score: Math.round(score * 1000) / 10, // 0..100, one decimal
  };
}
