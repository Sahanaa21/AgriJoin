import type {
  ApplicationStatus,
  Availability,
  JobStatus,
  Role,
  WageUnit,
} from './constants.js';

/**
 * Database row shapes. These mirror the SQL migrations in `supabase/migrations`.
 * They are hand-written (rather than generated) so the project has zero runtime
 * dependency on the Supabase CLI, but the column names must stay in sync with
 * the migrations.
 */

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  state: string | null;
  district: string | null;
  taluk: string | null;
  village: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Phone is stored apart from `profiles` so row-level security can fully
 * protect it (readable only by the owner, or a counterparty via the
 * consented get_shared_contact RPC). Email lives in auth.users.
 */
export interface UserContact {
  user_id: string;
  phone: string | null;
  updated_at: string;
}

export interface FarmerProfile {
  id: string; // == profiles.id
  farm_size_acres: number | null;
  main_crops: string[];
  farm_lat: number | null;
  farm_lng: number | null;
  created_at: string;
  updated_at: string;
}

export interface LabourerProfile {
  id: string; // == profiles.id
  skills: string[];
  work_preferences: string[];
  expected_wage: number | null;
  availability: Availability;
  available_from: string | null;
  loc_lat: number | null;
  loc_lng: number | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  farmer_id: string;
  title: string;
  category: string;
  description: string;
  crop: string | null;
  workers_needed: number;
  start_date: string;
  end_date: string;
  wage: number;
  wage_unit: WageUnit;
  state: string;
  district: string;
  locality: string;
  lat: number | null;
  lng: number | null;
  requirements: string | null;
  images: string[];
  status: JobStatus;
  created_at: string;
  updated_at: string;
}

export interface JobApplication {
  id: string;
  job_id: string;
  labourer_id: string;
  status: ApplicationStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  job_id: string | null;
  created_by: string;
  created_at: string;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  job_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

/**
 * A job joined with its farmer's public profile — the shape returned by the
 * `jobs_with_farmer` view and used by job cards.
 */
export interface JobWithFarmer extends Job {
  farmer_name: string;
  farmer_state: string | null;
  farmer_district: string | null;
  farmer_village: string | null;
  /** Count of currently-accepted/completed workers (from the view). */
  accepted_count?: number;
  /** Distance in km from the viewer, computed client-side when coords exist. */
  distance_km?: number | null;
}

/** An application joined with job + labourer, used in review/listing screens. */
export interface ApplicationWithRelations extends JobApplication {
  job?: Job;
  labourer?: Profile & { labourer_profile?: LabourerProfile | null };
}
