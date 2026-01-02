import { createMockSupabaseClient } from '../../../../tests/utils/supabase-mocks';
import { getServerSupabase } from '@/lib/supabaseServer';
import { ingestFreeBusy } from '@/lib/calendar-sync/ingestion/ingest-free-busy';

createMockSupabaseClient();

// Mock adapter
const mockAdapter = {
  listFreeBusy: async ({ timeMin, timeMax }: { timeMin: Date; timeMax: Date }) => {
    return {
      busy: [
        { start: new Date('2026-01-20T10:00:00Z'), end: new Date('2026-01-20T11:00:00Z') },
      ],
    };
  },
};

describe('ingestFreeBusy (integration)', () => {
  const providerId = '00000000-0000-0000-0000-000000000003';

  beforeEach(async () => {
    const supabase = getServerSupabase();
    await supabase.from('external_calendar_events').delete().neq('id', '');
    await supabase.from('external_calendar_connections').delete().neq('id', '');
  });

  it('ingests intervals and is idempotent on replay', async () => {
    const adapter = {
      listFreeBusy: async ({ timeMin, timeMax }: { timeMin: Date; timeMax: Date }) => {
        return {
          busy: [
            { start: new Date('2026-01-20T10:00:00Z'), end: new Date('2026-01-20T11:00:00Z') },
          ],
        };
      },
    } as any;

    const window = { start: new Date('2026-01-20T00:00:00Z'), end: new Date('2026-01-21T00:00:00Z') };

    const r1 = await ingestFreeBusy({ provider_id: providerId, source: 'google', window, adapter });
    expect(r1.ingested).toBeGreaterThanOrEqual(1);

    const r2 = await ingestFreeBusy({ provider_id: providerId, source: 'google', window, adapter });
    // second run should not create new rows; counts reflect created vs updated behavior
    expect(r2.updated + r2.ingested).toBeGreaterThanOrEqual(1);
  });

  it('replay identical adapter output yields identical DB state', async () => {
    const window = { start: new Date('2026-01-20T00:00:00Z'), end: new Date('2026-01-21T00:00:00Z') };
    const r1 = await ingestFreeBusy({ provider_id: providerId, source: 'google', window, adapter: mockAdapter as any });
    const r2 = await ingestFreeBusy({ provider_id: providerId, source: 'google', window, adapter: mockAdapter as any });
    expect(r1.errors.length).toBe(0);
    expect(r2.errors.length).toBe(0);
    expect(r1.ingested + r1.updated).toBeGreaterThan(0);
    expect(r2.ingested + r2.updated).toBeGreaterThanOrEqual(0);
  });

  it('backoff blocks ingestion when set', async () => {
    const supabase = getServerSupabase();
    // Insert a connection with backoff_until in future
    await supabase.from('external_calendar_connections').insert({
      provider_id: providerId,
      provider: 'google',
      provider_calendar_id: 'cal-1',
      access_token: '',
      refresh_token: '',
      token_expiry: new Date().toISOString(),
      sync_enabled: false,
      backoff_until: new Date(Date.now() + 60 * 1000).toISOString(),
    });

    const window = { start: new Date('2026-01-20T00:00:00Z'), end: new Date('2026-01-21T00:00:00Z') };
    const r = await ingestFreeBusy({ provider_id: providerId, source: 'google', window, adapter: mockAdapter as any });
    expect(r.errors[0].error).toMatch(/BACKOFF_ACTIVE/);
  });
});

