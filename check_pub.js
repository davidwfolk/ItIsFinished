require('dotenv').config({ path: 'apps/web/.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.rpc('debug_get_workspaces'); 
  // wait, I can just query pg_publication_tables with a quick rpc.
}
