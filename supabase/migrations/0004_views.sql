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
