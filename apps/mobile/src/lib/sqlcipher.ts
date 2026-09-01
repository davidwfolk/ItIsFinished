import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const TTL_KEY = 'LAST_SERVER_PING';
const ENCRYPTION_KEY_ID = 'DB_SQLCIPHER_KEY';
const ENTERPRISE_TTL_HOURS = 7 * 24; // 7 Days

export class KeystoreInvalidatedError extends Error {
  constructor() {
    super('OS Keystore was cryptographically invalidated. Database must be wiped.');
    this.name = 'KeystoreInvalidatedError';
  }
}

/**
 * Derives or retrieves the 256-bit encryption key for SQLCipher
 * This key is destroyed from memory and Keystore if TTL expires.
 */
export async function getOrGenerateEncryptionKey(): Promise<string> {
  try {
    let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_ID);
    if (!key) {
      // Generate a secure random hex string for SQLCipher (32 bytes = 256 bits = 64 hex chars)
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      key = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      await SecureStore.setItemAsync(ENCRYPTION_KEY_ID, key);
    }
    return key;
  } catch (error) {
    // This happens if the OS invalidates the Secure Enclave (e.g. user removes device passcode)
    console.error('Failed to retrieve SQLCipher key from SecureStore:', error);
    throw new KeystoreInvalidatedError();
  }
}

/**
 * Pings the server and updates the local TTL timestamp.
 * Should be called whenever a successful network request happens.
 */
export async function refreshTTL(supabaseClient: any) {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      await SecureStore.setItemAsync(TTL_KEY, Date.now().toString());
    }
  } catch (error) {
    console.warn('Failed to refresh TTL:', error);
  }
}

/**
 * Checks if the TTL has expired. If it has, drops the encryption key.
 * Returns true if the device is cryptographically locked.
 */
export async function checkAndEnforceTTL(): Promise<boolean> {
  try {
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
  } catch (error) {
    console.error('Failed to check TTL in SecureStore:', error);
    return true; // Lock down if we can't verify
  }
}
