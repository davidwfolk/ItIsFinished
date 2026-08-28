import { PowerSyncDatabase } from '@powersync/react-native';
import { AppSchema } from '@app/core';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hyrffgsjmobdffpgoalw.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Native C++ SQLite Database initialization for React Native (iOS & Android)
 */
export const powersync = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'finished_tasks.db'
  }
});
