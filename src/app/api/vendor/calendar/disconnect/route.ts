
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';
import { GoogleCalendarAdapterFactory } from '@/lib/calendar-adapters/google';
import { MicrosoftCalendarAdapterFactory } from '@/lib/calendar-adapters/microsoft';
import { CalendarSystemConfig } from '@/lib/calendar-adapters/types';

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const connectionId = searchParams.get('id');

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 });
    }

    const config = getSupabaseConfig();
    const supabase = createClient(config.url, config.secretKey);

    // 1. Get connection details to know provider
    const { data: connection, error } = await supabase
      .from('external_calendar_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (error || !connection) {
       return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // 2. Instantiate adapter to call disconnect (revoke token)
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
    } else if (connection.provider === 'microsoft') {
        const factory = new MicrosoftCalendarAdapterFactory();
        adapter = factory.createAdapter(adapterConfig);
    }

    if (adapter) {
        try {
            await adapter.disconnect(connectionId);
        } catch (disconnectError) {
            console.warn('Adapter disconnect failed, forcing DB deletion:', disconnectError);
            // Fallback to manual deletion if adapter fails
             await supabase
                .from('external_calendar_connections')
                .delete()
                .eq('id', connectionId);
        }
    } else {
        // Just delete from DB
        await supabase
          .from('external_calendar_connections')
          .delete()
          .eq('id', connectionId);
    }

    return NextResponse.json({ success: true, message: 'Disconnected' });

  } catch (error) {
    console.error('Disconnect Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
