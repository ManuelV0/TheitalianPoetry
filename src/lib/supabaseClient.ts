import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://djikypgmchywybjxbwar.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'INCOLLA QUI LA ANON KEY';

console.log('[WIDGET] SUPABASE URL =', supabaseUrl);
console.log('[WIDGET] SUPABASE KEY =', supabaseAnonKey?.slice(0, 20));

export const supabase = createClient(supabaseUrl, supabaseAnonKey);