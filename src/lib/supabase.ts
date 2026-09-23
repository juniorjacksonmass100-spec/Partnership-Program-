import { createClient } from '@supabase/supabase-js';

function cleanConfig(val?: string): string {
  if (!val) return '';
  const trimmed = val.trim();
  if (
    trimmed === '' ||
    trimmed.includes('YOUR_SUPABASE') ||
    trimmed.includes('MY_') ||
    trimmed.includes('your-project') ||
    trimmed.includes('example') ||
    trimmed === 'undefined' ||
    trimmed === 'null'
  ) {
    return '';
  }
  return trimmed;
}

const rawUrl =
  cleanConfig(import.meta.env.VITE_SUPABASE_URL) ||
  'https://anvwhhvojunhmswhksmt.supabase.co';

const supabaseUrl = rawUrl
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/$/, '')
  .trim();

const supabaseAnonKey =
  cleanConfig(import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_mf6fYrHLgZ_3tGw_y69Y_Q_OcO25K3v';

export const isSupabaseClientConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http')
);

// Frontend Supabase Client (uses public anon/publishable key)
export const supabase = isSupabaseClientConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
      },
    })
  : null;
