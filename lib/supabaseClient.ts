// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase env mancanti', {
    supabaseUrl,
    supabaseAnonKey,
  });
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);