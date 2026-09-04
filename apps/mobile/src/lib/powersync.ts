import { PowerSyncDatabase } from '@powersync/react-native';
import { AppSchema } from '@app/core';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hyrffgsjmobdffpgoalw.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_3KFP0qwqMPLz3IanQAYejA_VreUz38c';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let powersyncInstance: PowerSyncDatabase | null = null;

/**
 * Native C++ SQLite Database initialization for React Native (iOS & Android)
 * Wrapped in an async setup to inject the SQLCipher encryption key from the Secure Enclave.
 */
export const setupPowerSync = async (encryptionKey: string) => {
  if (powersyncInstance) return powersyncInstance;
  
  try {
    powersyncInstance = new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: 'finished_tasks.db',
        encryptionKey: encryptionKey // Passes down to op-sqlite for SQLCipher
      } as any
    });
  } catch (err) {
    // Fallback: initialize without encryption if encryptionKey config isn't supported yet
    console.warn('SQLCipher encryption not applied, falling back to unencrypted DB:', err);
    powersyncInstance = new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: 'finished_tasks.db',
      }
    });
  }
  
  return powersyncInstance;
};

// Export a getter for the singleton
export const getPowerSync = () => {
  if (!powersyncInstance) throw new Error('PowerSync not initialized');
  return powersyncInstance;
};
