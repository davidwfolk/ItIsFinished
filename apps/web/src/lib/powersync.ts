import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema, SupabasePowerSyncConnector } from '@app/core';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hyrffgsjmobdffpgoalw.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key';
const POWERSYNC_URL = import.meta.env.VITE_POWERSYNC_URL || 'https://6a9356a28453e7cf8332b2a9.powersync.journeyapps.com';

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
