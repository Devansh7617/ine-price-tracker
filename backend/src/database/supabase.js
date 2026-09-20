const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[DATABASE] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  // Don't crash immediately - allow server to start for health checks
}

// Use service role key for backend operations (bypasses RLS)
const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder',
  {
    auth: { persistSession: false },
  }
);

module.exports = { supabase };
