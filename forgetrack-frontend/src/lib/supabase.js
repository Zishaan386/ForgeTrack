import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lywfynijjbkcgifjkhux.supabase.co';
const supabaseAnonKey = 'sb_publishable_--4HrjyIrxs93SFXoiCYaQ_P2v-XUYF';

console.log("Supabase Client initializing with URL:", supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
