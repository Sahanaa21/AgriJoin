import { z } from 'zod';
import {
  APPLICATION_STATUSES,
  AVAILABILITY,
  CROPS,
  JOB_STATUSES,
  ROLES,
  SKILLS,
  STATES,
  WAGE_UNITS,
  WORK_CATEGORIES,
} from './constants.js';

/** Reusable primitives */
const nonEmpty = (label: string, max = 200) =>
  z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`).max(max);

const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined));

// Indian mobile number: 10 digits, optionally prefixed with +91 / 91 / 0.
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+?91|0)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

export const emailSchema = z.string().trim().email('Enter a valid email address');

const latitude = z.number().min(-90).max(90);
const longitude = z.number().min(-180).max(180);

/** ---------------- Auth ---------------- */
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    full_name: nonEmpty('Full name', 120),
    email: emailSchema,
    phone: phoneSchema.optional().or(z.literal('').transform(() => undefined)),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirm_password: z.string(),
    role: z.enum(ROLES, { required_error: 'Please choose a role' }),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

/** ---------------- Profiles ---------------- */
export const baseProfileSchema = z.object({
  full_name: nonEmpty('Full name', 120),
  phone: phoneSchema.optional().or(z.literal('').transform(() => undefined)),
  state: z.enum(STATES, { required_error: 'Select a state' }),
  district: nonEmpty('District', 80),
  taluk: optionalText(80),
  village: optionalText(80),
  avatar_url: optionalText(500),
});

export const farmerProfileSchema = baseProfileSchema.extend({
  farm_size_acres: z
    .number({ invalid_type_error: 'Enter a number' })
    .nonnegative('Farm size cannot be negative')
    .max(100000)
    .optional()
    .nullable(),
  main_crops: z.array(z.enum(CROPS)).min(1, 'Select at least one crop'),
  farm_lat: latitude.optional().nullable(),
  farm_lng: longitude.optional().nullable(),
});
export type FarmerProfileInput = z.infer<typeof farmerProfileSchema>;

export const labourerProfileSchema = baseProfileSchema.extend({
  skills: z.array(z.enum(SKILLS)).min(1, 'Select at least one skill'),
  work_preferences: z.array(z.enum(WORK_CATEGORIES)).default([]),
  expected_wage: z
    .number({ invalid_type_error: 'Enter a number' })
    .nonnegative('Wage cannot be negative')
    .max(1000000)
    .optional()
    .nullable(),
  availability: z.enum(AVAILABILITY).default('available_now'),
  available_from: z.string().optional().nullable(),
  loc_lat: latitude.optional().nullable(),
  loc_lng: longitude.optional().nullable(),
});
export type LabourerProfileInput = z.infer<typeof labourerProfileSchema>;

/** ---------------- Jobs ---------------- */
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date picker (YYYY-MM-DD)');

export const jobSchema = z
  .object({
    title: nonEmpty('Job title', 120),
    category: z.enum(WORK_CATEGORIES, { required_error: 'Select a work category' }),
    description: nonEmpty('Description', 2000),
    crop: z.enum(CROPS).optional().nullable(),
    workers_needed: z
      .number({ invalid_type_error: 'Enter the number of workers' })
      .int('Must be a whole number')
      .positive('At least one worker is required')
      .max(1000),
    start_date: dateString,
    end_date: dateString,
    wage: z
      .number({ invalid_type_error: 'Enter the daily wage' })
      .nonnegative('Wage cannot be negative')
      .max(1000000),
    wage_unit: z.enum(WAGE_UNITS).default('day'),
    state: z.enum(STATES, { required_error: 'Select a state' }),
    district: nonEmpty('District', 80),
    locality: nonEmpty('Village / locality', 120),
    lat: latitude.optional().nullable(),
    lng: longitude.optional().nullable(),
    requirements: optionalText(1000),
    images: z.array(z.string().url()).max(6).default([]),
  })
  .refine((d) => d.end_date >= d.start_date, {
    message: 'End date cannot be before the start date',
    path: ['end_date'],
  });
export type JobInput = z.infer<typeof jobSchema>;

export const jobStatusSchema = z.object({
  status: z.enum(JOB_STATUSES),
});

/** ---------------- Applications ---------------- */
export const applicationSchema = z.object({
  job_id: z.string().uuid(),
  message: optionalText(1000),
});
export type ApplicationInput = z.infer<typeof applicationSchema>;

export const applicationStatusSchema = z.object({
  status: z.enum(APPLICATION_STATUSES),
});

/** ---------------- Messaging ---------------- */
export const messageSchema = z.object({
  conversation_id: z.string().uuid(),
  body: nonEmpty('Message', 2000),
});
export type MessageInput = z.infer<typeof messageSchema>;

export const startConversationSchema = z.object({
  other_user_id: z.string().uuid(),
  job_id: z.string().uuid().optional().nullable(),
});

/** ---------------- Job discovery filters ---------------- */
export const jobFilterSchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.enum(WORK_CATEGORIES).optional(),
  state: z.enum(STATES).optional(),
  district: z.string().trim().max(80).optional(),
  min_wage: z.number().nonnegative().optional(),
  max_wage: z.number().nonnegative().optional(),
  max_distance_km: z.number().positive().optional(),
  sort: z
    .enum(['recent', 'nearest', 'highest_wage', 'starting_soon', 'best_match'])
    .default('recent'),
  page: z.number().int().positive().default(1),
  page_size: z.number().int().positive().max(50).default(10),
});
export type JobFilter = z.infer<typeof jobFilterSchema>;
