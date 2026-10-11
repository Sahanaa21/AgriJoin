/**
 * Shared, domain-wide constants for AgriJoin.
 * Kept deliberately small and framework-agnostic so the web app,
 * mobile app, API and database seed can all reference one source of truth.
 */

export const ROLES = ['farmer', 'labourer'] as const;
export type Role = (typeof ROLES)[number];

/** Lifecycle of a job posting. */
export const JOB_STATUSES = ['open', 'paused', 'filled', 'closed'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** Lifecycle of a labourer's application to a job. */
export const APPLICATION_STATUSES = [
  'pending',
  'accepted',
  'rejected',
  'withdrawn',
  'completed',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Statuses that still "occupy" a slot on a job (count against capacity). */
export const ACTIVE_APPLICATION_STATUSES: ApplicationStatus[] = ['accepted', 'completed'];

export const AVAILABILITY = ['available_now', 'available_from', 'unavailable'] as const;
export type Availability = (typeof AVAILABILITY)[number];

export const WAGE_UNITS = ['day', 'hour', 'task', 'month'] as const;
export type WageUnit = (typeof WAGE_UNITS)[number];

/** Agricultural work categories a job can belong to. */
export const WORK_CATEGORIES = [
  'Harvesting',
  'Planting',
  'Picking',
  'Cutting',
  'Irrigation',
  'Spraying',
  'Weeding',
  'Tractor Operation',
  'Loading',
  'General Labour',
  'Other',
] as const;
export type WorkCategory = (typeof WORK_CATEGORIES)[number];

/** Crops a farmer can grow (also used as a job's associated crop). */
export const CROPS = [
  'Rice',
  'Wheat',
  'Cotton',
  'Sugarcane',
  'Vegetables',
  'Maize',
  'Pulses',
  'Fruits',
  'Groundnut',
  'Soybean',
  'Other',
] as const;
export type Crop = (typeof CROPS)[number];

/** Skills a labourer can offer. */
export const SKILLS = [
  'Rice Harvesting',
  'Wheat Harvesting',
  'Cotton Picking',
  'Vegetable Planting',
  'Fruit Picking',
  'Irrigation',
  'Spraying',
  'Tractor Operation',
  'General Agricultural Labour',
  'Other',
] as const;
export type Skill = (typeof SKILLS)[number];

/** Indian states offered in the pickers (subset shown in the UI chips). */
export const STATES = [
  'Karnataka',
  'Maharashtra',
  'Andhra Pradesh',
  'Telangana',
  'Tamil Nadu',
  'Kerala',
  'Gujarat',
  'Punjab',
  'Haryana',
  'Uttar Pradesh',
] as const;
export type State = (typeof STATES)[number];

/** Deterministic sort options for job discovery. */
export const JOB_SORTS = [
  'recent',
  'nearest',
  'highest_wage',
  'starting_soon',
  'best_match',
] as const;
export type JobSort = (typeof JOB_SORTS)[number];

export const CURRENCY_SYMBOL = '₹'; // ₹
