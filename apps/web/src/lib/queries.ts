import {
  haversineKm,
  matchScore,
  type ApplicationWithRelations,
  type FarmerProfile,
  type Job,
  type JobApplication,
  type JobFilter,
  type JobWithFarmer,
  type LabourerProfile,
  type LatLng,
  type Profile,
} from '@agrijoin/shared';
import { supabase } from './supabase';

/** Normalise a Supabase error into a thrown Error with a readable message. */
function must<T>(data: T | null, error: { message: string } | null, ctx: string): T {
  if (error) throw new Error(`${ctx}: ${error.message}`);
  if (data == null) throw new Error(`${ctx}: no data returned`);
  return data;
}

/* ----------------------------- Profiles ----------------------------- */

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw new Error(`getProfile: ${error.message}`);
  return data as Profile | null;
}

export async function getFarmerProfile(id: string): Promise<FarmerProfile | null> {
  const { data, error } = await supabase.from('farmer_profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`getFarmerProfile: ${error.message}`);
  return data as FarmerProfile | null;
}

export async function getLabourerProfile(id: string): Promise<LabourerProfile | null> {
  const { data, error } = await supabase.from('labourer_profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`getLabourerProfile: ${error.message}`);
  return data as LabourerProfile | null;
}

export async function getMyPhone(): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_shared_contact', {
    p_user: (await supabase.auth.getUser()).data.user?.id,
  });
  if (error) return null;
  return (data as string | null) ?? null;
}

export interface CoreProfileInput {
  full_name: string;
  state: string;
  district: string;
  taluk?: string;
  village?: string;
  avatar_url?: string;
}

/** Create/update the base profile + phone contact. */
export async function saveCoreProfile(
  userId: string,
  role: 'farmer' | 'labourer',
  core: CoreProfileInput,
  phone?: string,
): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    role,
    full_name: core.full_name,
    state: core.state,
    district: core.district,
    taluk: core.taluk ?? null,
    village: core.village ?? null,
    avatar_url: core.avatar_url ?? null,
  });
  if (error) throw new Error(`saveCoreProfile: ${error.message}`);

  if (phone !== undefined) {
    const { error: cErr } = await supabase
      .from('user_contacts')
      .upsert({ user_id: userId, phone: phone || null });
    if (cErr) throw new Error(`saveCoreProfile(contact): ${cErr.message}`);
  }
}

export async function saveFarmerProfile(
  userId: string,
  data: Partial<FarmerProfile>,
): Promise<void> {
  const { error } = await supabase.from('farmer_profiles').upsert({ id: userId, ...data });
  if (error) throw new Error(`saveFarmerProfile: ${error.message}`);
}

export async function saveLabourerProfile(
  userId: string,
  data: Partial<LabourerProfile>,
): Promise<void> {
  const { error } = await supabase.from('labourer_profiles').upsert({ id: userId, ...data });
  if (error) throw new Error(`saveLabourerProfile: ${error.message}`);
}

/* ------------------------------- Jobs ------------------------------- */

function decorateDistance(jobs: JobWithFarmer[], viewer?: LatLng | null): JobWithFarmer[] {
  return jobs.map((j) => ({
    ...j,
    distance_km: viewer ? haversineKm(viewer, j.lat != null && j.lng != null ? { lat: j.lat, lng: j.lng } : null) : null,
  }));
}

/** Discover open jobs with filters, pagination and deterministic sorting. */
export async function listOpenJobs(
  filter: Partial<JobFilter>,
  viewer?: LatLng | null,
  labourer?: { skills: string[]; work_preferences?: string[]; expected_wage?: number | null } | null,
): Promise<{ rows: JobWithFarmer[]; total: number }> {
  const page = filter.page ?? 1;
  const pageSize = filter.page_size ?? 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase.from('jobs_with_farmer').select('*', { count: 'exact' }).eq('status', 'open');

  if (filter.category) q = q.eq('category', filter.category);
  if (filter.state) q = q.eq('state', filter.state);
  if (filter.district) q = q.ilike('district', `%${filter.district}%`);
  if (filter.min_wage != null) q = q.gte('wage', filter.min_wage);
  if (filter.max_wage != null) q = q.lte('wage', filter.max_wage);
  if (filter.q) q = q.or(`title.ilike.%${filter.q}%,description.ilike.%${filter.q}%`);

  // SQL-level ordering for the sorts that don't need the viewer's coordinates.
  if (filter.sort === 'highest_wage') q = q.order('wage', { ascending: false });
  else if (filter.sort === 'starting_soon') q = q.order('start_date', { ascending: true });
  else q = q.order('created_at', { ascending: false }); // 'recent' default

  const { data, error, count } = await q.range(from, to);
  if (error) throw new Error(`listOpenJobs: ${error.message}`);

  let rows = decorateDistance((data ?? []) as JobWithFarmer[], viewer);

  // Distance filter + viewer-dependent sorts happen on the fetched page.
  if (filter.max_distance_km != null) {
    rows = rows.filter((r) => r.distance_km != null && r.distance_km <= filter.max_distance_km!);
  }
  if (filter.sort === 'nearest') {
    rows = [...rows].sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity));
  } else if (filter.sort === 'best_match' && labourer) {
    rows = [...rows]
      .map((r) => ({
        r,
        s: matchScore(
          { category: r.category, crop: r.crop, wage: r.wage, created_at: r.created_at, coords: r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : null },
          { skills: labourer.skills, work_preferences: labourer.work_preferences, expected_wage: labourer.expected_wage, coords: viewer ?? null },
        ).score,
      }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.r);
  }

  return { rows, total: count ?? rows.length };
}

export async function getJobWithFarmer(id: string, viewer?: LatLng | null): Promise<JobWithFarmer | null> {
  const { data, error } = await supabase.from('jobs_with_farmer').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`getJobWithFarmer: ${error.message}`);
  if (!data) return null;
  return decorateDistance([data as JobWithFarmer], viewer)[0];
}

export async function listMyJobs(farmerId: string, status?: string): Promise<JobWithFarmer[]> {
  let q = supabase.from('jobs_with_farmer').select('*').eq('farmer_id', farmerId);
  if (status && status !== 'all') q = q.eq('status', status);
  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) throw new Error(`listMyJobs: ${error.message}`);
  return (data ?? []) as JobWithFarmer[];
}

export type CreateJobInput = Omit<Job, 'id' | 'farmer_id' | 'created_at' | 'updated_at' | 'status'>;

export async function createJob(farmerId: string, input: CreateJobInput): Promise<Job> {
  const { data, error } = await supabase
    .from('jobs')
    .insert({ ...input, farmer_id: farmerId })
    .select('*')
    .single();
  return must(data as Job, error, 'createJob');
}

export async function updateJob(id: string, patch: Partial<CreateJobInput>): Promise<Job> {
  const { data, error } = await supabase.from('jobs').update(patch).eq('id', id).select('*').single();
  return must(data as Job, error, 'updateJob');
}

export async function setJobStatus(jobId: string, status: string): Promise<Job> {
  const { data, error } = await supabase.rpc('set_job_status', { p_job_id: jobId, p_status: status });
  return must(data as Job, error, 'setJobStatus');
}

/* --------------------------- Applications --------------------------- */

export async function applyToJob(jobId: string, message?: string): Promise<JobApplication> {
  const { data, error } = await supabase.rpc('apply_to_job', { p_job_id: jobId, p_message: message ?? null });
  return must(data as JobApplication, error, 'applyToJob');
}

export async function setApplicationStatus(applicationId: string, status: string): Promise<JobApplication> {
  const { data, error } = await supabase.rpc('set_application_status', {
    p_application_id: applicationId,
    p_status: status,
  });
  return must(data as JobApplication, error, 'setApplicationStatus');
}

export async function getMyApplicationForJob(jobId: string, labourerId: string): Promise<JobApplication | null> {
  const { data, error } = await supabase
    .from('job_applications')
    .select('*')
    .eq('job_id', jobId)
    .eq('labourer_id', labourerId)
    .maybeSingle();
  if (error) throw new Error(`getMyApplicationForJob: ${error.message}`);
  return data as JobApplication | null;
}

export async function listMyApplications(labourerId: string): Promise<ApplicationWithRelations[]> {
  const { data, error } = await supabase
    .from('job_applications')
    .select('*, job:jobs(*)')
    .eq('labourer_id', labourerId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`listMyApplications: ${error.message}`);
  return (data ?? []) as ApplicationWithRelations[];
}

export async function listApplicationsForJob(jobId: string): Promise<ApplicationWithRelations[]> {
  const { data, error } = await supabase
    .from('job_applications')
    .select('*, labourer:profiles!job_applications_labourer_id_fkey(*)')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`listApplicationsForJob: ${error.message}`);
  return (data ?? []) as ApplicationWithRelations[];
}

export async function listApplicationsForMyJobs(farmerId: string): Promise<ApplicationWithRelations[]> {
  const { data, error } = await supabase
    .from('job_applications')
    .select('*, job:jobs!inner(*), labourer:profiles!job_applications_labourer_id_fkey(*)')
    .eq('job.farmer_id', farmerId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`listApplicationsForMyJobs: ${error.message}`);
  return (data ?? []) as ApplicationWithRelations[];
}

/* ---------------------------- Dashboards ---------------------------- */

export interface FarmerStats {
  activeJobs: number;
  totalApplications: number;
  pendingApplications: number;
}

export async function getFarmerStats(farmerId: string): Promise<FarmerStats> {
  const [jobs, apps] = await Promise.all([
    supabase.from('jobs').select('id,status').eq('farmer_id', farmerId),
    listApplicationsForMyJobs(farmerId),
  ]);
  if (jobs.error) throw new Error(`getFarmerStats: ${jobs.error.message}`);
  const activeJobs = (jobs.data ?? []).filter((j: { status: string }) => j.status === 'open').length;
  return {
    activeJobs,
    totalApplications: apps.length,
    pendingApplications: apps.filter((a) => a.status === 'pending').length,
  };
}

export interface LabourerStats {
  applied: number;
  accepted: number;
}

export async function getLabourerStats(labourerId: string): Promise<LabourerStats> {
  const apps = await listMyApplications(labourerId);
  return {
    applied: apps.length,
    accepted: apps.filter((a) => a.status === 'accepted' || a.status === 'completed').length,
  };
}

/* ---------------------------- Messaging ----------------------------- */

export interface ConversationSummary {
  id: string;
  job_id: string | null;
  job_title: string | null;
  other_user: { id: string; full_name: string } | null;
  last_message: string | null;
  last_at: string | null;
}

export async function getOrCreateConversation(otherUserId: string, jobId?: string | null): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_conversation', {
    p_other_user: otherUserId,
    p_job_id: jobId ?? null,
  });
  return must(data as string, error, 'getOrCreateConversation');
}

export async function listMyConversations(myId: string): Promise<ConversationSummary[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select(
      'id, job_id, job:jobs(title), participants:conversation_participants(user_id, profile:profiles(id, full_name)), messages(body, created_at)',
    )
    .order('created_at', { ascending: false });
  if (error) throw new Error(`listMyConversations: ${error.message}`);

  type Row = {
    id: string;
    job_id: string | null;
    job: { title: string } | null;
    participants: { user_id: string; profile: { id: string; full_name: string } | null }[];
    messages: { body: string; created_at: string }[];
  };

  return ((data ?? []) as unknown as Row[]).map((c) => {
    const other = c.participants.find((p) => p.user_id !== myId)?.profile ?? null;
    const msgs = [...c.messages].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const last = msgs[msgs.length - 1] ?? null;
    return {
      id: c.id,
      job_id: c.job_id,
      job_title: c.job?.title ?? null,
      other_user: other,
      last_message: last?.body ?? null,
      last_at: last?.created_at ?? null,
    };
  });
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export async function listMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`listMessages: ${error.message}`);
  return (data ?? []) as ChatMessage[];
}

export async function sendMessage(conversationId: string, senderId: string, body: string): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body })
    .select('id, sender_id, body, created_at')
    .single();
  return must(data as ChatMessage, error, 'sendMessage');
}

/* --------------------------- Notifications -------------------------- */

export async function listNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw new Error(`listNotifications: ${error.message}`);
  return data ?? [];
}