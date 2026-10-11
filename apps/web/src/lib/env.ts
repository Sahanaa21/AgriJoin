/**
 * Public Supabase configuration for the web app.
 * Only the URL and the ANON (public) key live here — both are safe to ship
 * to the browser *because* Row Level Security protects the data. The
 * service-role key must NEVER appear in this app.
 */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
export const API_URL = import.meta.env.VITE_API_URL ?? '';

/** True only when both required values are present and look valid. */
export const isSupabaseConfigured =
  SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 20;
