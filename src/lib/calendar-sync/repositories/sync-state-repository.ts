import { getServerSupabase } from '@/lib/supabaseServer';

export type SyncState = {
  provider_id: string;
  source: 'google' | 'microsoft';
  sync_cursor?: string | null;
  last_synced_at?: string | null;
  backoff_until?: string | null;
  error_count?: number;
  last_error?: any | null;
};

export const syncStateRepository = {
  async getSyncState(params: { provider_id: string; source: 'google' | 'microsoft' }): Promise<SyncState | null> {
    const supabase = getServerSupabase();
    const { provider_id, source } = params;
    const { data, error } = await supabase
      .from('external_calendar_connections')
      .select('provider_id, provider, sync_cursor, last_synced_at, backoff_until, error_count, last_error')
      .eq('provider_id', provider_id)
      .eq('provider', source)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to read sync state: ${String(error)}`);
    }

    if (!data) return null;

    return {
      provider_id: data.provider_id,
      source,
      sync_cursor: data.sync_cursor ?? null,
      last_synced_at: data.last_synced_at ?? null,
      backoff_until: data.backoff_until ?? null,
      error_count: data.error_count ?? 0,
      last_error: data.last_error ?? null,
    };
  },

  async updateSyncState(params: {
    provider_id: string;
    source: 'google' | 'microsoft';
    cursor?: string;
    last_synced_at?: Date;
    backoff_until?: Date | null;
    error_count?: number;
    last_error?: any | null;
  }): Promise<void> {
    const supabase = getServerSupabase();
    const { provider_id, source, cursor, last_synced_at, backoff_until, error_count, last_error } = params;

    // Upsert behavior: if connection exists, update; otherwise insert minimal row
    const { data: existing, error: selErr } = await supabase
      .from('external_calendar_connections')
      .select('id')
      .eq('provider_id', provider_id)
      .eq('provider', source)
      .maybeSingle();

    if (selErr) {
      throw new Error(`Failed to read connection: ${String(selErr)}`);
    }

    const payload: any = {};
    if (cursor !== undefined) payload.sync_cursor = cursor;
    if (last_synced_at !== undefined) payload.last_synced_at = last_synced_at ? last_synced_at.toISOString() : null;
    if (backoff_until !== undefined) payload.backoff_until = backoff_until ? backoff_until.toISOString() : null;
    if (error_count !== undefined) payload.error_count = error_count;
    if (last_error !== undefined) payload.last_error = last_error;

    if (existing) {
      const { error: updErr } = await supabase
        .from('external_calendar_connections')
        .update(payload)
        .eq('id', existing.id);
      if (updErr) throw new Error(`Failed to update sync state: ${String(updErr)}`);
      return;
    }

    // Insert minimal new row
    const insertRow = {
      provider_id,
      provider: source,
      provider_calendar_id: null,
      access_token: '',
      refresh_token: '',
      token_expiry: new Date().toISOString(),
      sync_enabled: false,
      ...payload,
    };

    const { error: insErr } = await supabase.from('external_calendar_connections').insert(insertRow);
    if (insErr) throw new Error(`Failed to insert sync state: ${String(insErr)}`);
  },
};

export type SyncStateRepository = typeof syncStateRepository;

