import { 
  AbstractPowerSyncDatabase, 
  PowerSyncBackendConnector, 
  PowerSyncCredentials, 
  UpdateType 
} from '@powersync/common';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ConnectorConfig {
  supabase: SupabaseClient;
  powersyncUrl: string;
}

/**
 * Universal PowerSync Backend Connector linking Supabase Auth & PostgreSQL
 * to local client SQLite databases across Web, Mobile, and Desktop.
 */
export class SupabasePowerSyncConnector implements PowerSyncBackendConnector {
  private supabase: SupabaseClient;
  private powersyncUrl: string;

  constructor(config: ConnectorConfig) {
    this.supabase = config.supabase;
    this.powersyncUrl = config.powersyncUrl;
  }

  /**
   * Fetches valid JWT auth token from Supabase Session for WebSocket sync streams.
   */
  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const { data: { session }, error } = await this.supabase.auth.getSession();

    if (error || !session) {
      return null;
    }

    return {
      endpoint: this.powersyncUrl,
      token: session.access_token,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined
    };
  }

  /**
   * Uploads local SQLite offline transaction queue to Supabase PostgreSQL.
   */
  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) {
      return;
    }

    try {
      for (const op of transaction.crud) {
        const table = op.table;
        const data = op.opData ? { ...op.opData } : {};

        switch (op.op) {
          case UpdateType.PUT: {
            data.id = op.id;
            const { error } = await this.supabase
              .from(table)
              .upsert(data);
            if (error) {
              if (error.code === 'QZ001' || error.code === '23503') {
                console.warn(`[PowerSync] Dropping invalid PUT on ${table}: ${error.message} (Code: ${error.code})`);
              } else {
                throw new Error(`Supabase Upsert Failed on ${table}: ${error.message}`);
              }
            }
            break;
          }

          case UpdateType.PATCH: {
            const { error } = await this.supabase
              .from(table)
              .update(data)
              .eq('id', op.id);
            if (error) {
              if (error.code === 'QZ001' || error.code === '23503') {
                console.warn(`[PowerSync] Dropping invalid PATCH on ${table}: ${error.message} (Code: ${error.code})`);
              } else {
                throw new Error(`Supabase Update Failed on ${table}: ${error.message}`);
              }
            }
            break;
          }

          case UpdateType.DELETE: {
            // In local-first, soft-delete is preferred for replication integrity
            const { error } = await this.supabase
              .from(table)
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', op.id);
            if (error) throw new Error(`Supabase Soft Delete Failed on ${table}: ${error.message}`);
            break;
          }
        }
      }

      // Mark transaction successfully uploaded
      await transaction.complete();
    } catch (ex: any) {
      console.error('PowerSync Data Upload Error:', ex);
      throw ex;
    }
  }
}
