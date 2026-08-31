import * as SecureStore from 'expo-secure-store';
import { supabase } from './powersync';

const TTL_KEY = 'LAST_SERVER_PING';
const ENCRYPTION_KEY_ID = 'DB_SQLCIPHER_KEY';
const ENTERPRISE_TTL_HOURS = 7 * 24; // 7 Days

/**
 * Derives or retrieves the 256-bit encryption key for SQLCipher
 * This key is destroyed from memory and Keystore if TTL expires.
 */
export async function getOrGenerateEncryptionKey(): Promise<string | null> {
  let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_ID);
  if (!key) {
    // Generate a secure random key for SQLCipher
    // In production, use expo-crypto or react-native-get-random-values
    key = 'super_secure_random_key_placeholder'; 
    await SecureStore.setItemAsync(ENCRYPTION_KEY_ID, key);
  }
  return key;
}

/**
 * Pings the server and updates the local TTL timestamp.
 * Should be called whenever a successful network request happens.
 */
export async function refreshTTL() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await SecureStore.setItemAsync(TTL_KEY, Date.now().toString());
  }
}

/**
 * Checks if the TTL has expired. If it has, drops the encryption key.
 * Returns true if the device is cryptographically locked.
 */
export async function checkAndEnforceTTL(): Promise<boolean> {
  const lastPing = await SecureStore.getItemAsync(TTL_KEY);
  if (!lastPing) return false; // First launch

  const hoursSincePing = (Date.now() - parseInt(lastPing, 10)) / (1000 * 60 * 60);

  // Hard TTL Check
  if (hoursSincePing >= ENTERPRISE_TTL_HOURS) {
    // 💥 Cryptographic Lock: Destroy the key from the native Keystore
    await SecureStore.deleteItemAsync(ENCRYPTION_KEY_ID);
    
    // The SQLite DB is now unreadable without a fresh server auth to re-derive it
    return true; 
  }

  return false;
}
