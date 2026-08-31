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

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    // Track failed parent IDs for Cascading Skips (DAG)
    const failedParentIds = new Set<string>();
    let hasError = false;

    for (const op of transaction.crud) {
      try {
        // CASCADING SKIP: If this operation references a failed parent, skip it gracefully
        if (op.opData && typeof op.opData === 'object') {
          const relatedIds = Object.values(op.opData).filter(v => typeof v === 'string');
          if (relatedIds.some(id => failedParentIds.has(id as string))) {
            console.warn(`[Cascading Skip] Skipping ${op.table} (${op.id}) because a parent failed.`);
            failedParentIds.add(op.id);
            continue; // Skip, but leave in the queue
          }
        }

        const table = op.table;
        
        switch (op.op) {
          case UpdateType.PUT: {
            const { error } = await supabase.from(table).upsert({ ...op.opData, id: op.id });
            if (error) throw error;
            break;
          }
          case UpdateType.PATCH: {
            const { error } = await supabase.from(table).update(op.opData).eq('id', op.id);
            if (error) throw error;
            break;
          }
          case UpdateType.DELETE: {
            const { error } = await supabase.from(table).delete().eq('id', op.id);
            if (error) throw error;
            break;
          }
        }
      } catch (ex) {
        hasError = true;
        console.error(`[Upload Error] Table: ${op.table}, ID: ${op.id}`, ex);
        // Flag this ID as failed so children (like Tasks of this Project) are skipped
        failedParentIds.add(op.id);
      }
    }

    if (!hasError) {
      // All successful: clear the queue
      await transaction.complete();
    } else {
      console.log('Upload queue had validation errors. Pausing queue to preserve integrity.');
      // Keep transaction open, user must fix validation errors in UI (e.g. name too long)
    }
  }
}
