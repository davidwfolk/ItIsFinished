require('dotenv').config({ path: 'apps/web/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkProfiles() {
  const { data: profiles, error: pError } = await supabase.rpc('debug_get_profiles');
  console.log('Profiles:', profiles);
  if (pError) console.error('Error fetching profiles:', pError);

  const { data: workspaces, error: wError } = await supabase.rpc('debug_get_workspaces');
  console.log('Workspaces:', workspaces);
  if (wError) console.error('Error fetching workspaces:', wError);

  const { data: members, error: mError } = await supabase.rpc('debug_get_workspace_members');
  console.log('Members:', members);
  if (mError) console.error('Error fetching members:', mError);
}

checkProfiles();
