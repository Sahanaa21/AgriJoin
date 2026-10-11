import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from './env.js';

/**
 * A Supabase client bound to the END USER's JWT. All queries run as that user,
 * so Row Level Security applies exactly as it does in the browser. This is the
 * correct way to perform user actions server-side — NOT the service role.
 */
export function userClient(accessToken: string): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Service-role client — bypasses RLS. Only for trusted admin/maintenance work
 * (e.g. seeding). Never expose this or its key to clients.
 */
export function adminClient(): SupabaseClient {
  if (!config.supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
