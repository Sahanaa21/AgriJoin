// ============================================================
// AgriJoin — demo data seeder (reliable path)
//
// Creates DEMO auth users via the Supabase Admin API (service role),
// then inserts clearly-labelled demo profiles, jobs and applications.
// All people are fictional. Do NOT run against production data.
//
// Usage (from repo root, after filling .env):
//   node --env-file=.env supabase/seed.mjs
// Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the env.
// ============================================================
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.');
  console.error('Fill .env from .env.example, then: node --env-file=.env supabase/seed.mjs');
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const DEMO_PASSWORD = 'DemoPass123!'; // documented demo password — NOT a real secret

/** Fixed UUIDs so the seed is idempotent and re-runnable. */
const F = {
  suresh: '00000000-0000-4000-8000-000000000001',
  rajesh: '00000000-0000-4000-8000-000000000002',
  venkatesh: '00000000-0000-4000-8000-000000000003',
  mahesh: '00000000-0000-4000-8000-000000000004',
};
const L = {
  one: '00000000-0000-4000-8000-000000000101',
  two: '00000000-0000-4000-8000-000000000102',
};
const J = {
  cotton: '00000000-0000-4000-9000-000000000001',
  rice: '00000000-0000-4000-9000-000000000002',
  sugarcane: '00000000-0000-4000-9000-000000000003',
  veg: '00000000-0000-4000-9000-000000000004',
  wheat: '00000000-0000-4000-9000-000000000005',
};

const users = [
  { id: F.suresh, email: 'demo.suresh@agrijoin.test', name: 'Suresh Patil (demo)', role: 'farmer' },
  { id: F.rajesh, email: 'demo.rajesh@agrijoin.test', name: 'Rajesh Kumar (demo)', role: 'farmer' },
  { id: F.venkatesh, email: 'demo.venkatesh@agrijoin.test', name: 'Venkatesh Reddy (demo)', role: 'farmer' },
  { id: F.mahesh, email: 'demo.mahesh@agrijoin.test', name: 'Mahesh Gowda (demo)', role: 'farmer' },
  { id: L.one, email: 'demo.labourer1@agrijoin.test', name: 'Demo Labourer One', role: 'labourer' },
  { id: L.two, email: 'demo.labourer2@agrijoin.test', name: 'Demo Labourer Two', role: 'labourer' },
];

async function createUsers() {
  for (const u of users) {
    const { error } = await db.auth.admin.createUser({
      // Deterministic id keeps the seed idempotent across re-runs.
      id: u.id,
      email: u.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: u.name, role: u.role, demo: true },
    });
    if (error && !/already been registered|already exists/i.test(error.message)) {
      throw new Error(`createUser ${u.email}: ${error.message}`);
    }
    console.log(`  user ok: ${u.email}`);
  }
}

const profiles = [
  { id: F.suresh, role: 'farmer', full_name: 'Suresh Patil (demo)', state: 'Karnataka', district: 'Dharwad', taluk: 'Hubli', village: 'Hubli' },
  { id: F.rajesh, role: 'farmer', full_name: 'Rajesh Kumar (demo)', state: 'Karnataka', district: 'Mysuru', taluk: 'Mysuru', village: 'Mysuru' },
  { id: F.venkatesh, role: 'farmer', full_name: 'Venkatesh Reddy (demo)', state: 'Karnataka', district: 'Belagavi', taluk: 'Belagavi', village: 'Belagavi' },
  { id: F.mahesh, role: 'farmer', full_name: 'Mahesh Gowda (demo)', state: 'Karnataka', district: 'Hassan', taluk: 'Hassan', village: 'Hassan' },
  { id: L.one, role: 'labourer', full_name: 'Demo Labourer One', state: 'Karnataka', district: 'Hassan', taluk: 'Hassan', village: 'Hassan' },
  { id: L.two, role: 'labourer', full_name: 'Demo Labourer Two', state: 'Karnataka', district: 'Mysuru', taluk: 'Mysuru', village: 'Mysuru' },
];

const farmerProfiles = [
  { id: F.suresh, farm_size_acres: 8, main_crops: ['Cotton'], farm_lat: 15.3647, farm_lng: 75.124 },
  { id: F.rajesh, farm_size_acres: 12, main_crops: ['Rice'], farm_lat: 12.2958, farm_lng: 76.6394 },
  { id: F.venkatesh, farm_size_acres: 20, main_crops: ['Sugarcane'], farm_lat: 15.8497, farm_lng: 74.4977 },
  { id: F.mahesh, farm_size_acres: 5, main_crops: ['Vegetables'], farm_lat: 13.0033, farm_lng: 76.096 },
];

const labourerProfiles = [
  { id: L.one, skills: ['Rice Harvesting', 'Cotton Picking'], work_preferences: ['Harvesting', 'Picking'], expected_wage: 500, availability: 'available_now', loc_lat: 13.0033, loc_lng: 76.096 },
  { id: L.two, skills: ['Vegetable Planting', 'Irrigation'], work_preferences: ['Planting', 'Irrigation'], expected_wage: 450, availability: 'available_now', loc_lat: 12.2958, loc_lng: 76.6394 },
];

const contacts = [
  { user_id: F.suresh, phone: '9000000001' },
  { user_id: L.one, phone: '9000000101' },
];

const jobs = [
  { id: J.cotton, farmer_id: F.suresh, title: 'Cotton Picking', category: 'Picking', crop: 'Cotton', description: 'Need workers for cotton picking across 8 acres near Hubli.', workers_needed: 12, start_date: '2026-08-01', end_date: '2026-08-20', wage: 450, wage_unit: 'day', state: 'Karnataka', district: 'Dharwad', locality: 'Hubli Taluk', lat: 15.3647, lng: 75.124, status: 'open' },
  { id: J.rice, farmer_id: F.rajesh, title: 'Rice Harvesting', category: 'Harvesting', crop: 'Rice', description: 'Paddy harvesting help required for the kharif season.', workers_needed: 9, start_date: '2026-07-05', end_date: '2026-08-05', wage: 500, wage_unit: 'day', state: 'Karnataka', district: 'Mysuru', locality: 'Mysuru', lat: 12.2958, lng: 76.6394, status: 'open' },
  { id: J.sugarcane, farmer_id: F.venkatesh, title: 'Sugarcane Cutting', category: 'Cutting', crop: 'Sugarcane', description: 'Experienced sugarcane cutters needed for 20 acres.', workers_needed: 15, start_date: '2026-07-22', end_date: '2026-09-01', wage: 600, wage_unit: 'day', state: 'Karnataka', district: 'Belagavi', locality: 'Belagavi', lat: 15.8497, lng: 74.4977, status: 'open' },
  { id: J.veg, farmer_id: F.mahesh, title: 'Vegetables Planting', category: 'Planting', crop: 'Vegetables', description: 'Transplanting and planting of mixed vegetables.', workers_needed: 5, start_date: '2026-07-20', end_date: '2026-07-30', wage: 400, wage_unit: 'day', state: 'Karnataka', district: 'Hassan', locality: 'Hassan', lat: 13.0033, lng: 76.096, status: 'open' },
  { id: J.wheat, farmer_id: F.rajesh, title: 'Wheat Harvesting', category: 'Harvesting', crop: 'Wheat', description: 'Short wheat harvesting assignment.', workers_needed: 6, start_date: '2026-07-25', end_date: '2026-08-10', wage: 480, wage_unit: 'day', state: 'Karnataka', district: 'Mysuru', locality: 'Nanjangud', lat: 12.1216, lng: 76.6796, status: 'open' },
];

const applications = [
  { job_id: J.veg, labourer_id: L.one, status: 'pending', message: 'Available immediately, experienced in planting.' },
  { job_id: J.cotton, labourer_id: L.one, status: 'pending', message: 'Can start on the first day.' },
];

async function upsert(table, rows, conflict = 'id') {
  const { error } = await db.from(table).upsert(rows, { onConflict: conflict });
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`  seeded ${table}: ${rows.length}`);
}

async function main() {
  console.log('AgriJoin demo seed — creating users...');
  await createUsers();
  console.log('Seeding domain data...');
  await upsert('profiles', profiles);
  await upsert('user_contacts', contacts, 'user_id');
  await upsert('farmer_profiles', farmerProfiles);
  await upsert('labourer_profiles', labourerProfiles);
  await upsert('jobs', jobs);
  await upsert('job_applications', applications, 'job_id,labourer_id');
  console.log('\nDone. Demo login password for every demo user:', DEMO_PASSWORD);
  console.log('Example farmer:   demo.suresh@agrijoin.test');
  console.log('Example labourer: demo.labourer1@agrijoin.test');
}

main().catch((e) => {
  console.error('\nSeed failed:', e.message);
  process.exit(1);
});
