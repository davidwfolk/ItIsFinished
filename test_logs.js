require('dotenv').config({ path: 'apps/web/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkLogs() {
  const { data, error } = await supabase.from('debug_logs').select('*');
  console.log('Logs:', data);
  if (error) console.error('Error:', error);
}

checkLogs();
