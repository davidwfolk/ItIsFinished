import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema, SupabasePowerSyncConnector } from '@app/core';
import { createClient } from '@supabase/supabase-js';

function requireEnv(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY' | 'VITE_POWERSYNC_URL'): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

const SUPABASE_URL = requireEnv('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = requireEnv('VITE_SUPABASE_ANON_KEY');
const POWERSYNC_URL = requireEnv('VITE_POWERSYNC_URL');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const powersync = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'finished_tasks_web.db'
  }
});

export const connector = new SupabasePowerSyncConnector({
  supabase,
  powersyncUrl: POWERSYNC_URL
});

/**
 * Initializes PowerSync and seeds initial demo data if the local SQLite database is empty.
 */
export async function initDatabase() {
  await powersync.init();
}
