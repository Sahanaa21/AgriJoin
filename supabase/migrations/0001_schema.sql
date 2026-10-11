-- ============================================================
-- AgriJoin — 0001 schema
-- Core tables for the agricultural labour marketplace.
-- Run order: 0001_schema -> 0002_rls -> 0003_functions -> (seed.sql)
-- ============================================================

-- gen_random_uuid() lives in pgcrypto (available by default on Supabase).
create extension if not exists pgcrypto;

-- Keep updated_at columns fresh.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- profiles : one row per auth user (farmer OR labourer)
-- id mirrors auth.users.id so RLS can compare against auth.uid()
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('farmer','labourer')),
  full_name   text not null,
  state       text,
  district    text,
  taluk       text,
  village     text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- user_contacts : phone number kept OUT of the broadly-readable
-- profiles table so RLS (row-level) can fully protect it. Phone is
-- only visible to the owner, or to a counterparty via the consented
-- get_shared_contact() RPC. Email lives in auth.users already.
-- ------------------------------------------------------------
create table if not exists public.user_contacts (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  phone      text,
  updated_at timestamptz not null default now()
);

create trigger trg_user_contacts_updated
  before update on public.user_contacts
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- farmer_profiles : extra details for farmers (1:1 with profiles)
-- ------------------------------------------------------------
create table if not exists public.farmer_profiles (
  id              uuid primary key references public.profiles(id) on delete cascade,
  farm_size_acres numeric(10,2) check (farm_size_acres is null or farm_size_acres >= 0),
  main_crops      text[] not null default '{}',
  farm_lat        double precision check (farm_lat is null or (farm_lat between -90 and 90)),
  farm_lng        double precision check (farm_lng is null or (farm_lng between -180 and 180)),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_farmer_profiles_updated
  before update on public.farmer_profiles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- labourer_profiles : extra details for labourers (1:1 with profiles)
-- ------------------------------------------------------------
create table if not exists public.labourer_profiles (
  id               uuid primary key references public.profiles(id) on delete cascade,
  skills           text[] not null default '{}',
  work_preferences text[] not null default '{}',
  expected_wage    numeric(10,2) check (expected_wage is null or expected_wage >= 0),
  availability     text not null default 'available_now'
                     check (availability in ('available_now','available_from','unavailable')),
  available_from   date,
  loc_lat          double precision check (loc_lat is null or (loc_lat between -90 and 90)),
  loc_lng          double precision check (loc_lng is null or (loc_lng between -180 and 180)),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger trg_labourer_profiles_updated
  before update on public.labourer_profiles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- jobs : agricultural job postings owned by a farmer
-- ------------------------------------------------------------
create table if not exists public.jobs (
  id             uuid primary key default gen_random_uuid(),
  farmer_id      uuid not null references public.profiles(id) on delete cascade,
  title          text not null,
  category       text not null,
  description    text not null,
  crop           text,
  workers_needed integer not null check (workers_needed > 0),
  start_date     date not null,
  end_date       date not null,
  wage           numeric(10,2) not null check (wage >= 0),
  wage_unit      text not null default 'day' check (wage_unit in ('day','hour','task','month')),
  state          text not null,
  district       text not null,
  locality       text not null,
  lat            double precision check (lat is null or (lat between -90 and 90)),
  lng            double precision check (lng is null or (lng between -180 and 180)),
  requirements   text,
  images         text[] not null default '{}',
  status         text not null default 'open' check (status in ('open','paused','filled','closed')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint jobs_dates_valid check (end_date >= start_date)
);

create trigger trg_jobs_updated
  before update on public.jobs
  for each row execute function public.set_updated_at();

create index if not exists idx_jobs_status      on public.jobs(status);
create index if not exists idx_jobs_farmer       on public.jobs(farmer_id);
create index if not exists idx_jobs_category      on public.jobs(category);
create index if not exists idx_jobs_state_district on public.jobs(state, district);
create index if not exists idx_jobs_created        on public.jobs(created_at desc);

-- ------------------------------------------------------------
-- job_applications : a labourer applies to a job
-- UNIQUE(job_id, labourer_id) enforces "no duplicate applications"
-- at the database level (defence in depth beyond client/RPC checks).
-- ------------------------------------------------------------
create table if not exists public.job_applications (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references public.jobs(id) on delete cascade,
  labourer_id uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'pending'
                check (status in ('pending','accepted','rejected','withdrawn','completed')),
  message     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint uq_application_per_labourer unique (job_id, labourer_id)
);

create trigger trg_applications_updated
  before update on public.job_applications
  for each row execute function public.set_updated_at();

create index if not exists idx_applications_job      on public.job_applications(job_id);
create index if not exists idx_applications_labourer on public.job_applications(labourer_id);
create index if not exists idx_applications_status   on public.job_applications(status);

-- ------------------------------------------------------------
-- conversations + participants + messages
-- ------------------------------------------------------------
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid references public.jobs(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create index if not exists idx_participants_user on public.conversation_participants(user_id);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null check (length(trim(body)) > 0),
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at);

-- ------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  data       jsonb,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id, read, created_at desc);

-- ------------------------------------------------------------
-- reviews : structural only. The UI must NOT fabricate ratings;
-- it only shows a rating when a real review row exists.
-- ------------------------------------------------------------
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references public.jobs(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  constraint uq_review_once unique (job_id, reviewer_id, reviewee_id)
);

create index if not exists idx_reviews_reviewee on public.reviews(reviewee_id);
