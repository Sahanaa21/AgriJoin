import {
  haversineKm,
  type ApplicationWithRelations,
  type FarmerProfile,
  type Job,
  type JobApplication,
  type JobWithFarmer,
  type LabourerProfile,
  type LatLng,
  type Profile,
  type Role,
} from '@agrijoin/shared';
import { supabase } from './supabase';

function must<T>(data: T | null, error: { message: string } | null, ctx: string): T {
  if (error) throw new Error(`${ctx}: ${error.message}`);
  if (data == null) throw new Error(`${ctx}: no data`);
  return data;
}

export async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Profile | null;
}

export async function getFarmerProfile(id: string): Promise<FarmerProfile | null> {
  const { data } = await supabase.from('farmer_profiles').select('*').eq('id', id).maybeSingle();
  return (data as FarmerProfile) ?? null;
}

export async function getLabourerProfile(id: string): Promise<LabourerProfile | null> {
  const { data } = await supabase.from('labourer_profiles').select('*').eq('id', id).maybeSingle();
  return (data as LabourerProfile) ?? null;
}

export async function saveCoreProfile(
  userId: string,
  role: Role,
  core: { full_name: string; state: string; district: string; village?: string },
  phone?: string,
) {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    role,
    full_name: core.full_name,
    state: core.state,
    district: core.district,
    village: core.village ?? null,
  });
  if (error) throw new Error(error.message);
  if (phone !== undefined) {
    await supabase.from('user_contacts').upsert({ user_id: userId, phone: phone || null });
  }
}

export async function saveFarmerProfile(userId: string, data: Partial<FarmerProfile>) {
  const { error } = await supabase.from('farmer_profiles').upsert({ id: userId, ...data });
  if (error) throw new Error(error.message);
}

export async function saveLabourerProfile(userId: string, data: Partial<LabourerProfile>) {
  const { error } = await supabase.from('labourer_profiles').upsert({ id: userId, ...data });
  if (error) throw new Error(error.message);
}

function withDistance(rows: JobWithFarmer[], viewer?: LatLng | null): JobWithFarmer[] {
  return rows.map((j) => ({
    ...j,
    distance_km: viewer ? haversineKm(viewer, j.lat != null && j.lng != null ? { lat: j.lat, lng: j.lng } : null) : null,
  }));
}

export async function listOpenJobs(viewer?: LatLng | null, search?: string): Promise<JobWithFarmer[]> {
  let q = supabase.from('jobs_with_farmer').select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(50);
  if (search) q = q.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return withDistance((data ?? []) as JobWithFarmer[], viewer);
}

export async function getJob(id: string, viewer?: LatLng | null): Promise<JobWithFarmer | null> {
  const { data, error } = await supabase.from('jobs_with_farmer').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return withDistance([data as JobWithFarmer], viewer)[0];
}

export async function listMyJobs(farmerId: string): Promise<JobWithFarmer[]> {
  const { data, error } = await supabase
    .from('jobs_with_farmer')
    .select('*')
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as JobWithFarmer[];
}

export type CreateJobInput = Omit<Job, 'id' | 'farmer_id' | 'created_at' | 'updated_at' | 'status'>;

export async function createJob(farmerId: string, input: CreateJobInput): Promise<Job> {
  const { data, error } = await supabase.from('jobs').insert({ ...input, farmer_id: farmerId }).select('*').single();
  return must(data as Job, error, 'createJob');
}

export async function applyToJob(jobId: string, message?: string): Promise<JobApplication> {
  const { data, error } = await supabase.rpc('apply_to_job', { p_job_id: jobId, p_message: message ?? null });
  return must(data as JobApplication, error, 'applyToJob');
}

export async function setApplicationStatus(id: string, status: string): Promise<JobApplication> {
  const { data, error } = await supabase.rpc('set_application_status', { p_application_id: id, p_status: status });
  return must(data as JobApplication, error, 'setApplicationStatus');
}

export async function getMyApplicationForJob(jobId: string, labourerId: string): Promise<JobApplication | null> {
  const { data } = await supabase
    .from('job_applications')
    .select('*')
    .eq('job_id', jobId)
    .eq('labourer_id', labourerId)
    .maybeSingle();
  return (data as JobApplication) ?? null;
}

export async function listMyApplications(labourerId: string): Promise<ApplicationWithRelations[]> {
  const { data, error } = await supabase
    .from('job_applications')
    .select('*, job:jobs(*)')
    .eq('labourer_id', labourerId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ApplicationWithRelations[];
}

export async function listApplicationsForMyJobs(farmerId: string): Promise<ApplicationWithRelations[]> {
  const { data, error } = await supabase
    .from('job_applications')
    .select('*, job:jobs!inner(*), labourer:profiles!job_applications_labourer_id_fkey(*)')
    .eq('job.farmer_id', farmerId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ApplicationWithRelations[];
}

export async function setJobStatus(jobId: string, status: string): Promise<Job> {
  const { data, error } = await supabase.rpc('set_job_status', { p_job_id: jobId, p_status: status });
  return must(data as Job, error, 'setJobStatus');
}

/* ---------------------------- Messaging ----------------------------- */

export async function getOrCreateConversation(otherUserId: string, jobId?: string | null): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_conversation', {
    p_other_user: otherUserId,
    p_job_id: jobId ?? null,
  });
  return must(data as string, error, 'getOrCreateConversation');
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
  if (error) throw new Error(error.message);
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

export interface ConversationSummary {
  id: string;
  job_id: string | null;
  job_title: string | null;
  other_user: { id: string; full_name: string } | null;
  last_message: string | null;
}

export async function listMyConversations(myId: string): Promise<ConversationSummary[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select(
      'id, job_id, job:jobs(title), participants:conversation_participants(user_id, profile:profiles(id, full_name)), messages(body, created_at)',
    )
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
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
    return {
      id: c.id,
      job_id: c.job_id,
      job_title: c.job?.title ?? null,
      other_user: other,
      last_message: msgs[msgs.length - 1]?.body ?? null,
    };
  });
}

export async function getMyPhone(userId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_shared_contact', { p_user: userId });
  if (error) return null;
  return (data as string | null) ?? null;
}
