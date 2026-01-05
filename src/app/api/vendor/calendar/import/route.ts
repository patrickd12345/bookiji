import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseConfig } from '@/config/supabase';
import ical from 'node-ical';

// Helper to parse ICS date
function parseICSDate(val: Date | string): Date {
  return new Date(val);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const providerId = formData.get('providerId') as string;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const config = getSupabaseConfig();
    const cookieStore = await cookies();
    const supabase = createServerClient(
        config.url,
        config.publishableKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                     try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    } catch {
                        // ignored
                    }
                },
            },
        }
    );

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine target provider ID
    let targetProviderId = providerId;

    // If no providerId specified, use current user's profile ID
    if (!targetProviderId) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('auth_user_id', user.id)
            .single();

        if (profile) {
            targetProviderId = profile.id;
        }
    }

    if (!targetProviderId) {
         return NextResponse.json({ error: 'Missing providerId' }, { status: 400 });
    }

    // Security check: Ensure the authenticated user owns this provider ID
    const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('auth_user_id')
        .eq('id', targetProviderId)
        .single();

    if (!ownerProfile || ownerProfile.auth_user_id !== user.id) {
         return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const icsContent = buffer.toString('utf-8');

    const parsedData = ical.parseICS(icsContent);

    const slotsToInsert = [];

    for (const k in parsedData) {
      if (Object.prototype.hasOwnProperty.call(parsedData, k)) {
        const ev = parsedData[k];
        if (ev.type === 'VEVENT') {
          // Logic:
          // The prompt says: "Create availability slots from free events"
          // In ICS, free/busy is often denoted by TRANSP property.
          // TRANSP:TRANSPARENT -> Free (Available)
          // TRANSP:OPAQUE -> Busy (Not Available)
          // However, some calendar exports might just contain "Available" events.
          // Or the user might want to import BUSY times to BLOCK slots.
          // Prompt says: "Import an .ics file to create availability slots" and "Create availability slots from free events".
          // So we look for TRANSP:TRANSPARENT or explicitly marked available events.

          // Let's assume standard behavior:
          // If TRANSP is TRANSPARENT, it's an available slot.
          // Also check for summary text keywords if transp is missing? No, sticking to standard properties first.

          // Note: node-ical types might be loose.
          const isTransparent = ev.transparency === 'TRANSPARENT';

          if (isTransparent && ev.start && ev.end) {
             slotsToInsert.push({
               provider_id: targetProviderId,
               start_time: parseICSDate(ev.start).toISOString(),
               end_time: parseICSDate(ev.end).toISOString(),
               is_available: true,
               created_by: 'ics_import'
             });
          }
        }
      }
    }

    if (slotsToInsert.length > 0) {
      const { error } = await supabase
        .from('availability_slots')
        .insert(slotsToInsert);

      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      count: slotsToInsert.length,
      message: `Imported ${slotsToInsert.length} availability slots`
    });

  } catch (error) {
    console.error('ICS Import Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal Server Error'
    }, { status: 500 });
  }
}
