-- ============================================================
-- AgriJoin — seed.sql (demo domain data)
--
-- NOTE: profiles.id references auth.users(id). Auth users cannot be
-- created from plain SQL reliably across Supabase versions, so the
-- RECOMMENDED seeder is `node --env-file=.env supabase/seed.mjs`,
-- which creates the demo auth users (same UUIDs) via the Admin API
-- and then inserts this same domain data.
--
-- This file is provided for `supabase db reset` workflows: it will
-- only succeed once auth users with the UUIDs below exist. All people
-- are fictional DEMO records. Do NOT use with production data.
-- ============================================================

insert into public.profiles (id, role, full_name, state, district, taluk, village) values
  ('00000000-0000-4000-8000-000000000001','farmer','Suresh Patil (demo)','Karnataka','Dharwad','Hubli','Hubli'),
  ('00000000-0000-4000-8000-000000000002','farmer','Rajesh Kumar (demo)','Karnataka','Mysuru','Mysuru','Mysuru'),
  ('00000000-0000-4000-8000-000000000003','farmer','Venkatesh Reddy (demo)','Karnataka','Belagavi','Belagavi','Belagavi'),
  ('00000000-0000-4000-8000-000000000004','farmer','Mahesh Gowda (demo)','Karnataka','Hassan','Hassan','Hassan'),
  ('00000000-0000-4000-8000-000000000101','labourer','Demo Labourer One','Karnataka','Hassan','Hassan','Hassan'),
  ('00000000-0000-4000-8000-000000000102','labourer','Demo Labourer Two','Karnataka','Mysuru','Mysuru','Mysuru')
on conflict (id) do nothing;

insert into public.user_contacts (user_id, phone) values
  ('00000000-0000-4000-8000-000000000001','9000000001'),
  ('00000000-0000-4000-8000-000000000101','9000000101')
on conflict (user_id) do nothing;

insert into public.farmer_profiles (id, farm_size_acres, main_crops, farm_lat, farm_lng) values
  ('00000000-0000-4000-8000-000000000001',8,'{Cotton}',15.3647,75.124),
  ('00000000-0000-4000-8000-000000000002',12,'{Rice}',12.2958,76.6394),
  ('00000000-0000-4000-8000-000000000003',20,'{Sugarcane}',15.8497,74.4977),
  ('00000000-0000-4000-8000-000000000004',5,'{Vegetables}',13.0033,76.096)
on conflict (id) do nothing;

insert into public.labourer_profiles (id, skills, work_preferences, expected_wage, availability, loc_lat, loc_lng) values
  ('00000000-0000-4000-8000-000000000101','{"Rice Harvesting","Cotton Picking"}','{Harvesting,Picking}',500,'available_now',13.0033,76.096),
  ('00000000-0000-4000-8000-000000000102','{"Vegetable Planting",Irrigation}','{Planting,Irrigation}',450,'available_now',12.2958,76.6394)
on conflict (id) do nothing;

insert into public.jobs (id, farmer_id, title, category, crop, description, workers_needed, start_date, end_date, wage, wage_unit, state, district, locality, lat, lng, status) values
  ('00000000-0000-4000-9000-000000000001','00000000-0000-4000-8000-000000000001','Cotton Picking','Picking','Cotton','Need workers for cotton picking across 8 acres near Hubli.',12,'2026-08-01','2026-08-20',450,'day','Karnataka','Dharwad','Hubli Taluk',15.3647,75.124,'open'),
  ('00000000-0000-4000-9000-000000000002','00000000-0000-4000-8000-000000000002','Rice Harvesting','Harvesting','Rice','Paddy harvesting help required for the kharif season.',9,'2026-07-05','2026-08-05',500,'day','Karnataka','Mysuru','Mysuru',12.2958,76.6394,'open'),
  ('00000000-0000-4000-9000-000000000003','00000000-0000-4000-8000-000000000003','Sugarcane Cutting','Cutting','Sugarcane','Experienced sugarcane cutters needed for 20 acres.',15,'2026-07-22','2026-09-01',600,'day','Karnataka','Belagavi','Belagavi',15.8497,74.4977,'open'),
  ('00000000-0000-4000-9000-000000000004','00000000-0000-4000-8000-000000000004','Vegetables Planting','Planting','Vegetables','Transplanting and planting of mixed vegetables.',5,'2026-07-20','2026-07-30',400,'day','Karnataka','Hassan','Hassan',13.0033,76.096,'open'),
  ('00000000-0000-4000-9000-000000000005','00000000-0000-4000-8000-000000000002','Wheat Harvesting','Harvesting','Wheat','Short wheat harvesting assignment.',6,'2026-07-25','2026-08-10',480,'day','Karnataka','Mysuru','Nanjangud',12.1216,76.6796,'open')
on conflict (id) do nothing;

insert into public.job_applications (job_id, labourer_id, status, message) values
  ('00000000-0000-4000-9000-000000000004','00000000-0000-4000-8000-000000000101','pending','Available immediately, experienced in planting.'),
  ('00000000-0000-4000-9000-000000000001','00000000-0000-4000-8000-000000000101','pending','Can start on the first day.')
on conflict (job_id, labourer_id) do nothing;
