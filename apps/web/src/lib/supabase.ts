import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './env';

/**
 * Single shared Supabase browser client. If the environment is not yet
 * configured we still create a client with placeholder values so the app
 * can render the "configure Supabase" notice instead of crashing at import.
 */
export const supabase = createClient(
  isSupabaseConfigured ? SUPABASE_URL : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? SUPABASE_ANON_KEY : 'public-anon-placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export { isSupabaseConfigured };
