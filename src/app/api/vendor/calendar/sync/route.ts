
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';
import { GoogleCalendarAdapterFactory } from '@/lib/calendar-adapters/google';
import { MicrosoftCalendarAdapterFactory } from '@/lib/calendar-adapters/microsoft';
import { CalendarSystemConfig } from '@/lib/calendar-adapters/types';

export async function POST(req: NextRequest) {
  try {
    const { connectionId } = await req.json();

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 });
    }

    const config = getSupabaseConfig();
    const supabase = createClient(config.url, config.secretKey);

    // 1. Get connection details
    const { data: connection, error } = await supabase
      .from('external_calendar_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (error || !connection) {
       return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // 2. Instantiate adapter
    const adapterConfig: CalendarSystemConfig = {
        id: connection.id,
        name: connection.provider,
        type: connection.provider as any,
        authType: 'oauth2'
    };

    let adapter;
    if (connection.provider === 'google') {
        const factory = new GoogleCalendarAdapterFactory();
        adapter = factory.createAdapter(adapterConfig);
        // Note: Real implementation needs to set credentials on the adapter here
    } else if (connection.provider === 'microsoft') {
        const factory = new MicrosoftCalendarAdapterFactory();
        adapter = factory.createAdapter(adapterConfig);
    }

    // 3. Trigger sync logic (In a real system, this would queue a background job)
    // For now, we just update the timestamp to simulate a sync start/completion

    // Update last_synced_at
    await supabase
      .from('external_calendar_connections')
      .update({
          last_synced_at: new Date().toISOString(),
          error_count: 0,
          last_error: null
      })
      .eq('id', connectionId);

    return NextResponse.json({ success: true, message: 'Sync triggered' });
  } catch (error) {
    console.error('Sync Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
