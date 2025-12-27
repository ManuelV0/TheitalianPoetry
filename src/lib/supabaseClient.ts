import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://djikypgmchywybjxbwar.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqaWt5cGdtY2h5d3lianhid2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTMyOTIsImV4cCI6MjA2ODc4OTI5Mn0.dXqWkg47xTg2YtfLhBLrFd5AIB838KdsmR9qsMPkk8Q';

console.log('[WIDGET] SUPABASE URL =', supabaseUrl);
console.log('[WIDGET] SUPABASE KEY =', supabaseAnonKey?.slice(0, 20));

export const supabase = createClient(supabaseUrl, supabaseAnonKey);