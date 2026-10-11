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
