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
