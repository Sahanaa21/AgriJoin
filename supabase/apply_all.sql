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
-- ============================================================
-- AgriJoin — 0002 Row Level Security
-- Every table is RLS-enabled. Policies express exactly who may
-- read/write each row. Privileged/transactional logic lives in
-- SECURITY DEFINER functions (see 0003_functions.sql).
-- ============================================================

-- ------------------------------------------------------------
-- Helper functions (SECURITY DEFINER) to avoid recursive RLS.
-- A policy that queries the same table it protects would recurse;
-- these helpers run as owner and bypass RLS to answer safely.
-- ------------------------------------------------------------
create or replace function public.is_conversation_participant(p_conversation uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conversation and user_id = auth.uid()
  );
$$;

create or replace function public.owns_job(p_job uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.jobs where id = p_job and farmer_id = auth.uid()
  );
$$;

create or replace function public.current_role_is(p_role text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = p_role
  );
$$;

-- ------------------------------------------------------------
-- Enable RLS
-- ------------------------------------------------------------
alter table public.profiles                enable row level security;
alter table public.user_contacts           enable row level security;
alter table public.farmer_profiles         enable row level security;
alter table public.labourer_profiles       enable row level security;
alter table public.jobs                    enable row level security;
alter table public.job_applications        enable row level security;
alter table public.conversations           enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages                enable row level security;
alter table public.notifications           enable row level security;
alter table public.reviews                 enable row level security;

-- ------------------------------------------------------------
-- profiles : public identity (name + general location). No phone here.
-- ------------------------------------------------------------
create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_insert on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy profiles_update on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ------------------------------------------------------------
-- user_contacts : phone — owner only. Counterparties use the
-- consented get_shared_contact() RPC instead.
-- ------------------------------------------------------------
create policy contacts_select on public.user_contacts
  for select to authenticated using (auth.uid() = user_id);
create policy contacts_insert on public.user_contacts
  for insert to authenticated with check (auth.uid() = user_id);
create policy contacts_update on public.user_contacts
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- farmer_profiles : owner only
-- ------------------------------------------------------------
create policy farmer_profiles_select on public.farmer_profiles
  for select to authenticated using (auth.uid() = id);
create policy farmer_profiles_insert on public.farmer_profiles
  for insert to authenticated with check (auth.uid() = id);
create policy farmer_profiles_update on public.farmer_profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ------------------------------------------------------------
-- labourer_profiles : owner, plus farmers who received an
-- application from this labourer (to review skills/wage/availability).
-- ------------------------------------------------------------
create policy labourer_profiles_select on public.labourer_profiles
  for select to authenticated using (
    auth.uid() = id
    or exists (
      select 1 from public.jobs j
      join public.job_applications a on a.job_id = j.id
      where j.farmer_id = auth.uid() and a.labourer_id = labourer_profiles.id
    )
  );
create policy labourer_profiles_insert on public.labourer_profiles
  for insert to authenticated with check (auth.uid() = id);
create policy labourer_profiles_update on public.labourer_profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ------------------------------------------------------------
-- jobs : open jobs are discoverable by any authenticated user;
-- a farmer always sees their own; an applicant keeps visibility
-- of a job they applied to even after it closes.
-- ------------------------------------------------------------
create policy jobs_select on public.jobs
  for select to authenticated using (
    status = 'open'
    or farmer_id = auth.uid()
    or exists (
      select 1 from public.job_applications a
      where a.job_id = jobs.id and a.labourer_id = auth.uid()
    )
  );
create policy jobs_insert on public.jobs
  for insert to authenticated
  with check (farmer_id = auth.uid() and public.current_role_is('farmer'));
create policy jobs_update on public.jobs
  for update to authenticated
  using (farmer_id = auth.uid()) with check (farmer_id = auth.uid());
create policy jobs_delete on public.jobs
  for delete to authenticated using (farmer_id = auth.uid());

-- ------------------------------------------------------------
-- job_applications : labourer owns their applications; the job's
-- farmer can see applications to their jobs. Direct inserts allow
-- a labourer to apply to an OPEN job once (UNIQUE prevents dupes);
-- the apply_to_job() RPC is the recommended atomic path.
-- ------------------------------------------------------------
create policy applications_select on public.job_applications
  for select to authenticated using (
    labourer_id = auth.uid() or public.owns_job(job_id)
  );
create policy applications_insert on public.job_applications
  for insert to authenticated with check (
    labourer_id = auth.uid()
    and status = 'pending'
    and public.current_role_is('labourer')
    and exists (select 1 from public.jobs j where j.id = job_id and j.status = 'open')
  );
-- Labourer may update their own application (e.g. withdraw);
-- the job's farmer may update it (e.g. accept/reject).
-- Capacity-safe accept should go through set_application_status().
create policy applications_update on public.job_applications
  for update to authenticated
  using (labourer_id = auth.uid() or public.owns_job(job_id))
  with check (labourer_id = auth.uid() or public.owns_job(job_id));

-- ------------------------------------------------------------
-- conversations / participants / messages
-- ------------------------------------------------------------
create policy conversations_select on public.conversations
  for select to authenticated using (public.is_conversation_participant(id));
create policy conversations_insert on public.conversations
  for insert to authenticated with check (created_by = auth.uid());

create policy participants_select on public.conversation_participants
  for select to authenticated using (public.is_conversation_participant(conversation_id));
-- Inserting participants is done by the get_or_create_conversation() RPC
-- (SECURITY DEFINER). A user may still add themselves defensively.
create policy participants_insert on public.conversation_participants
  for insert to authenticated with check (
    user_id = auth.uid() or public.is_conversation_participant(conversation_id)
  );

create policy messages_select on public.messages
  for select to authenticated using (public.is_conversation_participant(conversation_id));
create policy messages_insert on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid() and public.is_conversation_participant(conversation_id)
  );
create policy messages_update on public.messages
  for update to authenticated
  using (public.is_conversation_participant(conversation_id))
  with check (public.is_conversation_participant(conversation_id));

-- ------------------------------------------------------------
-- notifications : owner only
-- ------------------------------------------------------------
create policy notifications_select on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_insert on public.notifications
  for insert to authenticated with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- reviews : readable by all authenticated users (real ratings only);
-- a reviewer may create a review for a job they took part in.
-- ------------------------------------------------------------
create policy reviews_select on public.reviews
  for select to authenticated using (true);
create policy reviews_insert on public.reviews
  for insert to authenticated with check (
    reviewer_id = auth.uid()
    and (
      public.owns_job(job_id)
      or exists (
        select 1 from public.job_applications a
        where a.job_id = reviews.job_id
          and a.labourer_id = auth.uid()
          and a.status in ('accepted','completed')
      )
    )
  );

-- ------------------------------------------------------------
-- Grants: authenticated users operate through RLS. anon has no
-- table access (the marketplace requires sign-in).
-- ------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
-- ============================================================
-- AgriJoin — 0003 transactional functions (business logic)
-- These SECURITY DEFINER functions enforce rules that plain RLS
-- cannot (atomic capacity checks, cross-table consent). They
-- ALWAYS derive identity from auth.uid() and never trust a
-- caller-supplied user id.
-- ============================================================

-- ------------------------------------------------------------
-- apply_to_job: a labourer applies to an open job.
-- Enforces: labourer role, job open & not expired, no duplicate.
-- The UNIQUE(job_id, labourer_id) constraint is the final backstop.
-- ------------------------------------------------------------
create or replace function public.apply_to_job(p_job_id uuid, p_message text default null)
returns public.job_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_job public.jobs;
  v_app public.job_applications;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if not public.current_role_is('labourer') then
    raise exception 'Only labourers can apply to jobs' using errcode = '42501';
  end if;

  select * into v_job from public.jobs where id = p_job_id;
  if not found then
    raise exception 'Job not found' using errcode = 'P0002';
  end if;
  if v_job.status <> 'open' then
    raise exception 'This job is % and not accepting applications', v_job.status using errcode = 'P0001';
  end if;
  if v_job.end_date < current_date then
    raise exception 'This job has expired' using errcode = 'P0001';
  end if;

  insert into public.job_applications (job_id, labourer_id, status, message)
  values (p_job_id, v_uid, 'pending', nullif(trim(p_message), ''))
  returning * into v_app;

  -- Notify the farmer.
  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_job.farmer_id, 'application_received',
    'New application', 'A labourer applied to "' || v_job.title || '"',
    jsonb_build_object('job_id', p_job_id, 'application_id', v_app.id)
  );

  return v_app;
exception
  when unique_violation then
    raise exception 'You have already applied to this job' using errcode = 'P0001';
end;
$$;

-- ------------------------------------------------------------
-- set_application_status: accept/reject (farmer) or withdraw (labourer).
-- Accepting is capacity-safe: the job row is locked and the accepted
-- count is re-checked to prevent overbooking under concurrency.
-- ------------------------------------------------------------
create or replace function public.set_application_status(p_application_id uuid, p_status text)
returns public.job_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_app public.job_applications;
  v_job public.jobs;
  v_accepted int;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_status not in ('pending','accepted','rejected','withdrawn','completed') then
    raise exception 'Invalid status %', p_status using errcode = '22023';
  end if;

  select * into v_app from public.job_applications where id = p_application_id;
  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;

  -- Lock the job row so concurrent accepts serialise.
  select * into v_job from public.jobs where id = v_app.job_id for update;

  -- Authorisation: labourer may only withdraw their own; farmer may
  -- accept/reject/complete applications to jobs they own.
  if p_status = 'withdrawn' then
    if v_app.labourer_id <> v_uid then
      raise exception 'You can only withdraw your own application' using errcode = '42501';
    end if;
  else
    if v_job.farmer_id <> v_uid then
      raise exception 'Only the job owner can change this application' using errcode = '42501';
    end if;
  end if;

  if p_status = 'accepted' then
    select count(*) into v_accepted
      from public.job_applications
      where job_id = v_job.id and status in ('accepted','completed') and id <> v_app.id;
    if v_accepted >= v_job.workers_needed then
      raise exception 'This job is already fully staffed' using errcode = 'P0001';
    end if;
  end if;

  update public.job_applications
    set status = p_status
    where id = p_application_id
    returning * into v_app;

  -- Auto-mark the job filled once capacity is reached.
  if p_status = 'accepted' then
    select count(*) into v_accepted
      from public.job_applications
      where job_id = v_job.id and status in ('accepted','completed');
    if v_accepted >= v_job.workers_needed and v_job.status = 'open' then
      update public.jobs set status = 'filled' where id = v_job.id;
    end if;
  end if;

  -- Notify the labourer when a farmer changes their application.
  if p_status in ('accepted','rejected','completed') then
    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_app.labourer_id, 'application_' || p_status,
      'Application ' || p_status,
      'Your application for "' || v_job.title || '" was ' || p_status,
      jsonb_build_object('job_id', v_job.id, 'application_id', v_app.id)
    );
  end if;

  return v_app;
end;
$$;

-- ------------------------------------------------------------
-- set_job_status: owner-only job lifecycle transitions.
-- ------------------------------------------------------------
create or replace function public.set_job_status(p_job_id uuid, p_status text)
returns public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_job public.jobs;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_status not in ('open','paused','filled','closed') then
    raise exception 'Invalid status %', p_status using errcode = '22023';
  end if;
  select * into v_job from public.jobs where id = p_job_id;
  if not found then
    raise exception 'Job not found' using errcode = 'P0002';
  end if;
  if v_job.farmer_id <> v_uid then
    raise exception 'Only the job owner can change its status' using errcode = '42501';
  end if;
  update public.jobs set status = p_status where id = p_job_id returning * into v_job;
  return v_job;
end;
$$;

-- ------------------------------------------------------------
-- get_or_create_conversation: finds the existing conversation
-- between the caller and another user (optionally scoped to a job),
-- or creates one with both participants.
-- ------------------------------------------------------------
create or replace function public.get_or_create_conversation(p_other_user uuid, p_job_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_conv uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_other_user = v_uid then
    raise exception 'Cannot start a conversation with yourself' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_other_user) then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  -- Look for an existing 1:1 conversation (same job scope) with both users.
  select c.id into v_conv
  from public.conversations c
  where c.job_id is not distinct from p_job_id
    and exists (select 1 from public.conversation_participants p where p.conversation_id = c.id and p.user_id = v_uid)
    and exists (select 1 from public.conversation_participants p where p.conversation_id = c.id and p.user_id = p_other_user)
  limit 1;

  if v_conv is not null then
    return v_conv;
  end if;

  insert into public.conversations (job_id, created_by) values (p_job_id, v_uid) returning id into v_conv;
  insert into public.conversation_participants (conversation_id, user_id)
    values (v_conv, v_uid), (v_conv, p_other_user);
  return v_conv;
end;
$$;

-- ------------------------------------------------------------
-- get_shared_contact: returns a counterparty's phone ONLY when
-- there is consent — i.e. an accepted application between the two,
-- or a shared conversation. Otherwise returns null (no leak).
-- ------------------------------------------------------------
create or replace function public.get_shared_contact(p_user uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ok boolean;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_user = v_uid then
    return (select phone from public.user_contacts where user_id = v_uid);
  end if;

  select exists (
    -- accepted application linking farmer <-> labourer
    select 1 from public.job_applications a
    join public.jobs j on j.id = a.job_id
    where a.status in ('accepted','completed')
      and ((j.farmer_id = v_uid and a.labourer_id = p_user)
        or (j.farmer_id = p_user and a.labourer_id = v_uid))
  ) or exists (
    -- shared conversation
    select 1 from public.conversation_participants p1
    join public.conversation_participants p2 on p1.conversation_id = p2.conversation_id
    where p1.user_id = v_uid and p2.user_id = p_user
  ) into v_ok;

  if not v_ok then
    return null;
  end if;
  return (select phone from public.user_contacts where user_id = p_user);
end;
$$;

-- Allow authenticated users to call these RPCs.
grant execute on function public.apply_to_job(uuid, text) to authenticated;
grant execute on function public.set_application_status(uuid, text) to authenticated;
grant execute on function public.set_job_status(uuid, text) to authenticated;
grant execute on function public.get_or_create_conversation(uuid, uuid) to authenticated;
grant execute on function public.get_shared_contact(uuid) to authenticated;
-- ============================================================
-- AgriJoin — 0004 read models (views)
-- security_invoker = true  ->  the querying user's RLS still applies,
-- so these views never widen access; they just save round-trips.
-- ============================================================

-- Jobs joined with the farmer's public identity + a live accepted count.
create or replace view public.jobs_with_farmer
with (security_invoker = true) as
select
  j.*,
  p.full_name as farmer_name,
  p.state     as farmer_state,
  p.district  as farmer_district,
  p.village   as farmer_village,
  (
    select count(*)
    from public.job_applications a
    where a.job_id = j.id and a.status in ('accepted','completed')
  )::int as accepted_count
from public.jobs j
join public.profiles p on p.id = j.farmer_id;

grant select on public.jobs_with_farmer to authenticated;
