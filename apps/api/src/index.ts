import { createApp } from './app.js';
import { config, isConfigured } from './env.js';

const app = createApp();
app.listen(config.port, () => {
  console.log(`AgriJoin API listening on http://localhost:${config.port}`);
  if (!isConfigured) {
    console.warn('⚠ Supabase not configured — set SUPABASE_URL and SUPABASE_ANON_KEY in .env');
  }
});
