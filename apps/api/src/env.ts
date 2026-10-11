import 'dotenv/config';

/**
 * Server-side configuration. The service-role key is read here and used ONLY
 * on the server for privileged/admin operations — it is never sent to clients.
 * User actions use the caller's own JWT so Row Level Security still applies.
 */
export const config = {
  port: Number(process.env.API_PORT ?? 4000),
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  corsOrigins: (process.env.API_CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};

export const isConfigured =
  config.supabaseUrl.startsWith('http') && config.supabaseAnonKey.length > 20;
