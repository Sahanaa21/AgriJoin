// ============================================================
// AgriJoin — end-to-end verification harness
//
// Exercises the real cross-role journey against the live Supabase
// project using USER-SCOPED clients (real JWTs), so Row Level Security
// and the SQL RPCs are genuinely tested — not bypassed with the service
// role. Creates two temporary users, runs the journey + negative RLS
// checks, prints PASS/FAIL per step, then deletes the temp users.
//
// Prerequisite: the 4 migrations must be applied first (see README).
// Run:  node --env-file=.env supabase/verify.mjs
// ============================================================
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const pub = process.env.SUPABASE_ANON_KEY;
if (!url || !secret || !pub) {
  console.error('Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { persistSession: false } });
const PW = 'VerifyPass123!';
let pass = 0,
  fail = 0;
function ok(name, cond, extra = '') {
  console.log(`${cond ? '  PASS' : '  FAIL'} — ${name}${extra ? ' :: ' + extra : ''}`);
  cond ? pass++ : fail++;
}

function userClient(token) {
  return createClient(url, pub, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function makeUser(email) {
  const c = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true });
  if (c.error) throw new Error('createUser ' + email + ': ' + c.error.message);
  const s = await createClient(url, pub, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password: PW });
  if (s.error) throw new Error('signIn ' + email + ': ' + s.error.message);
  return { id: c.data.user.id, token: s.data.session.access_token };
}

// placeholder-main

async function main() {
  const stamp = Date.now();
  const farmerEmail = `verify_farmer_${stamp}@agrijoin.test`;
  const labourerEmail = `verify_labourer_${stamp}@agrijoin.test`;
  const outsiderEmail = `verify_outsider_${stamp}@agrijoin.test`;
  let farmer, labourer, outsider;

  try {
    console.log('Setup: creating 3 temporary users…');
    [farmer, labourer, outsider] = await Promise.all([makeUser(farmerEmail), makeUser(labourerEmail), makeUser(outsiderEmail)]);
    const F = userClient(farmer.token);
    const L = userClient(labourer.token);
    const O = userClient(outsider.token);

    console.log('\n[A] Profiles & roles');
    ok('farmer creates own profile', !(await F.from('profiles').upsert({ id: farmer.id, role: 'farmer', full_name: 'Verify Farmer', state: 'Karnataka', district: 'Dharwad', village: 'Hubli' }).select().single()).error);
    ok('labourer creates own profile', !(await L.from('profiles').upsert({ id: labourer.id, role: 'labourer', full_name: 'Verify Labourer', state: 'Karnataka', district: 'Hassan', village: 'Hassan' }).select().single()).error);
    await O.from('profiles').upsert({ id: outsider.id, role: 'labourer', full_name: 'Verify Outsider', state: 'Karnataka', district: 'Mysuru' });
    await F.from('farmer_profiles').upsert({ id: farmer.id, main_crops: ['Cotton'], farm_lat: 15.36, farm_lng: 75.12 });
    await L.from('labourer_profiles').upsert({ id: labourer.id, skills: ['Cotton Picking'], work_preferences: ['Picking'], expected_wage: 450, loc_lat: 15.3, loc_lng: 75.1 });

    const spoof = await L.from('profiles').upsert({ id: farmer.id, role: 'labourer', full_name: 'HACKED' }).select();
    ok('labourer CANNOT modify farmer\'s profile (RLS)', !!spoof.error || (spoof.data?.length ?? 0) === 0, spoof.error?.message ?? 'no rows affected');

    console.log('\n[B] Farmer posts a job');
    const jobRes = await F.from('jobs').insert({
      farmer_id: farmer.id, title: 'Verify Cotton Picking', category: 'Picking', crop: 'Cotton',
      description: 'Automated verification job.', workers_needed: 2, start_date: '2026-08-01', end_date: '2026-08-20',
      wage: 450, wage_unit: 'day', state: 'Karnataka', district: 'Dharwad', locality: 'Hubli', lat: 15.36, lng: 75.12,
    }).select().single();
    ok('farmer creates a job', !jobRes.error, jobRes.error?.message);
    const jobId = jobRes.data?.id;

    const spoofJob = await L.from('jobs').insert({
      farmer_id: labourer.id, title: 'x', category: 'Picking', description: 'x', workers_needed: 1,
      start_date: '2026-08-01', end_date: '2026-08-02', wage: 1, state: 'Karnataka', district: 'x', locality: 'x',
    }).select();
    ok('labourer CANNOT create a job (role enforced by RLS)', !!spoofJob.error, spoofJob.error?.message);

    console.log('\n[C] Labourer discovers & applies');
    const browse = await L.from('jobs_with_farmer').select('*').eq('status', 'open');
    ok('labourer sees the open job in jobs_with_farmer', !browse.error && (browse.data ?? []).some((j) => j.id === jobId), browse.error?.message);

    const apply1 = await L.rpc('apply_to_job', { p_job_id: jobId, p_message: 'Verify apply' });
    ok('labourer applies via apply_to_job RPC', !apply1.error, apply1.error?.message);

    const apply2 = await L.rpc('apply_to_job', { p_job_id: jobId, p_message: 'again' });
    ok('duplicate application is blocked', !!apply2.error, apply2.error?.message);

    console.log('\n[D] Farmer reviews & accepts');
    const appsForFarmer = await F.from('job_applications').select('*').eq('job_id', jobId);
    ok('farmer sees the application to their job', !appsForFarmer.error && (appsForFarmer.data?.length ?? 0) === 1, appsForFarmer.error?.message);
    const appId = appsForFarmer.data?.[0]?.id;

    const outsiderPeek = await O.from('job_applications').select('*').eq('job_id', jobId);
    ok('outsider CANNOT see others\' applications (RLS)', !outsiderPeek.error && (outsiderPeek.data?.length ?? 0) === 0, `rows=${outsiderPeek.data?.length}`);

    const accept = await F.rpc('set_application_status', { p_application_id: appId, p_status: 'accepted' });
    ok('farmer accepts the application via RPC', !accept.error, accept.error?.message);

    const outsiderAccept = await O.rpc('set_application_status', { p_application_id: appId, p_status: 'rejected' });
    ok('outsider CANNOT change the application (RPC authz)', !!outsiderAccept.error, outsiderAccept.error?.message);

    console.log('\n[E] Labourer sees updated status');
    const myApps = await L.from('job_applications').select('*').eq('labourer_id', labourer.id);
    ok('labourer sees status = accepted', (myApps.data?.[0]?.status) === 'accepted', `status=${myApps.data?.[0]?.status}`);

    console.log('\n[F] Messaging permissions');
    const conv = await L.rpc('get_or_create_conversation', { p_other_user: farmer.id, p_job_id: jobId });
    ok('labourer opens conversation with farmer', !conv.error, conv.error?.message);
    const convId = conv.data;
    const sent = await L.from('messages').insert({ conversation_id: convId, sender_id: labourer.id, body: 'Hello from verify' }).select();
    ok('participant can send a message', !sent.error, sent.error?.message);
    const outsiderRead = await O.from('messages').select('*').eq('conversation_id', convId);
    ok('outsider CANNOT read the conversation (RLS)', !outsiderRead.error && (outsiderRead.data?.length ?? 0) === 0, `rows=${outsiderRead.data?.length}`);

    console.log('\n[G] Contact privacy');
    await admin.from('user_contacts').upsert({ user_id: farmer.id, phone: '9000000000' });
    const sharedOk = await L.rpc('get_shared_contact', { p_user: farmer.id });
    ok('accepted labourer CAN get farmer phone (consent)', !sharedOk.error && !!sharedOk.data, sharedOk.data ? 'got phone' : 'null');
    const sharedNo = await O.rpc('get_shared_contact', { p_user: farmer.id });
    ok('outsider CANNOT get farmer phone (no consent)', !sharedNo.error && !sharedNo.data, sharedNo.data ? 'LEAK!' : 'null');
  } catch (e) {
    console.error('\nHARNESS ERROR:', e.message);
    fail++;
  } finally {
    for (const u of [farmer, labourer, outsider]) if (u?.id) await admin.auth.admin.deleteUser(u.id).catch(() => {});
    console.log('\nCleanup: temporary users deleted.');
  }

  console.log(`\n================  ${pass} passed, ${fail} failed  ================`);
  process.exit(fail === 0 ? 0 : 1);
}

main();