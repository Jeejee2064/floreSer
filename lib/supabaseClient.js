// /lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

let supabase = null;

if (typeof window !== 'undefined') {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables!');
  } else {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
}

export { supabase };
