import { createClient } from '@supabase/supabase-js';

// GitHub Pages is a static frontend, so the publishable Supabase URL/key may be
// injected at build time. Keep a public fallback as a safety net so a build
// that misses VITE_* variables cannot crash the entire application at startup.
const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ||
  'https://lwnsdsncmlsroiswgoga.supabase.co';

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3bnNkc25jbWxzcm9pc3dnb2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MjY1NTMsImV4cCI6MjEwMDUwMjU1M30.Yg3HawF-O5LRylT4YwkkrpqV78YTxctVgzd55PzqRf8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
