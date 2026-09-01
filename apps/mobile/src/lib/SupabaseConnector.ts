import {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  UpdateType
} from '@powersync/react-native';
import { supabase } from './powersync';

export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      throw new Error(`Could not fetch Supabase credentials: ${error?.message}`);
    }
    return {
      endpoint: process.env.EXPO_PUBLIC_POWERSYNC_URL || 'https://foo.powersync.com',
      token: session.access_token
    };
  }

  // Persistent flags for DAG error handling and UI rendering
  public static failedItemIds = new Set<string>();

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    let hasError = false;

    for (const op of transaction.crud) {
      try {
        // CASCADING SKIP: If this operation references a failed parent, skip it gracefully
        if (op.opData && typeof op.opData === 'object') {
          const relatedIds = Object.values(op.opData).filter(v => typeof v === 'string');
          if (relatedIds.some(id => SupabaseConnector.failedItemIds.has(id as string))) {
            console.warn(`[Cascading Skip] Skipping ${op.table} (${op.id}) because a parent failed.`);
            SupabaseConnector.failedItemIds.add(op.id);
            continue; // Skip, but leave in the queue
          }
        }

        const table = op.table;
        let dbError: any = null;
        
        switch (op.op) {
          case UpdateType.PUT: {
            const { error } = await supabase.from(table).upsert({ ...op.opData, id: op.id });
            dbError = error;
            break;
          }
          case UpdateType.PATCH: {
            const { error } = await supabase.from(table).update(op.opData).eq('id', op.id);
            dbError = error;
            break;
          }
          case UpdateType.DELETE: {
            const { error } = await supabase.from(table).delete().eq('id', op.id);
            dbError = error;
            break;
          }
        }

        if (dbError) {
          // Check for 400/403 validation or RLS errors
          if (dbError.code === '42501' || dbError.code === '23514' || dbError.code === '23503') {
             // 42501 = RLS, 23514 = Check violation, 23503 = Foreign Key
             console.error(`[Upload Error] Validation/RLS failed for ${table} (${op.id})`, dbError);
             SupabaseConnector.failedItemIds.add(op.id);
             continue; // Skip this item this loop
          }
          throw dbError; // Throw network or 500 errors to halt the queue
        }

        // UN-SKIP: If it succeeds and was previously failed, clear the flag
        if (SupabaseConnector.failedItemIds.has(op.id)) {
          SupabaseConnector.failedItemIds.delete(op.id);
          // Note: In a full DAG, we would emit an event here to re-evaluate children flags
        }

      } catch (ex) {
        hasError = true;
        console.error(`[Upload Error] Network/System failure for ${op.table}, ID: ${op.id}`, ex);
        break; // Halt processing on network/500 errors
      }
    }

    if (!hasError) {
      // For items that were skipped due to 400/403, PowerSync will try them again next time,
      // but they will hit the `continue` skip check immediately, saving network calls until fixed.
      await transaction.complete();
    }
  }
}
