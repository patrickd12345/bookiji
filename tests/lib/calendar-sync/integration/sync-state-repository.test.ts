import { createMockSupabaseClient } from '../../../../tests/utils/supabase-mocks';
import { getServerSupabase } from '@/lib/supabaseServer';
import { syncStateRepository } from '@/lib/calendar-sync/repositories/sync-state-repository';

createMockSupabaseClient();

describe('SyncStateRepository (integration)', () => {
  const providerId = '00000000-0000-0000-0000-000000000002';

  beforeEach(async () => {
    const supabase = getServerSupabase();
    await supabase.from('external_calendar_connections').delete().neq('id', '');
  });

  it('get/create sync state and update cursor monotonically', async () => {
    // initially null
    let st = await syncStateRepository.getSyncState({ provider_id: providerId, source: 'google' });
    expect(st).toBeNull();

    // create via updateSyncState
    await syncStateRepository.updateSyncState({
      provider_id: providerId,
      source: 'google',
      cursor: 'c1',
      last_synced_at: new Date('2026-01-01T00:00:00Z'),
    });

    st = await syncStateRepository.getSyncState({ provider_id: providerId, source: 'google' });
    expect(st).not.toBeNull();
    expect(st?.sync_cursor).toBe('c1');

    // advance cursor
    await syncStateRepository.updateSyncState({
      provider_id: providerId,
      source: 'google',
      cursor: 'c2',
    });
    st = await syncStateRepository.getSyncState({ provider_id: providerId, source: 'google' });
    expect(st?.sync_cursor).toBe('c2');
  });

  it('persists backoff and error tracking', async () => {
    await syncStateRepository.updateSyncState({
      provider_id: providerId,
      source: 'google',
      backoff_until: new Date(Date.now() + 60 * 1000),
      error_count: 2,
      last_error: { message: 'boom' },
    });

    const st = await syncStateRepository.getSyncState({ provider_id: providerId, source: 'google' });
    expect(st).not.toBeNull();
    expect(st?.error_count).toBe(2);
    expect(st?.last_error).toMatchObject({ message: 'boom' });
    expect(st?.backoff_until).toBeTruthy();
  });

  it('get/create and update cursor monotonically', async () => {
    const providerId2 = '00000000-0000-0000-0000-000000000010';
    const s1 = await syncStateRepository.getSyncState({ provider_id: providerId2, source: 'google' });
    expect(s1).toBeNull();

    await syncStateRepository.updateSyncState({
      provider_id: providerId2,
      source: 'google',
      cursor: 'c1',
      last_synced_at: new Date(),
      error_count: 0,
    });

    const s2 = await syncStateRepository.getSyncState({ provider_id: providerId2, source: 'google' });
    expect(s2).not.toBeNull();
    expect(s2?.sync_cursor).toBe('c1');

    // Advance cursor
    await syncStateRepository.updateSyncState({
      provider_id: providerId2,
      source: 'google',
      cursor: 'c2',
    });
    const s3 = await syncStateRepository.getSyncState({ provider_id: providerId2, source: 'google' });
    expect(s3?.sync_cursor).toBe('c2');
  });

  it('backoff and error tracking persists', async () => {
    const providerId3 = '00000000-0000-0000-0000-000000000011';
    await syncStateRepository.updateSyncState({
      provider_id: providerId3,
      source: 'google',
      backoff_until: new Date(Date.now() + 1000 * 60),
      error_count: 2,
      last_error: { message: 'test' },
    });

    const s = await syncStateRepository.getSyncState({ provider_id: providerId3, source: 'google' });
    expect(s?.error_count).toBe(2);
    expect(s?.last_error?.message).toBe('test');
    expect(s?.backoff_until).toBeTruthy();
  });
});

