import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

/**
 * Cron job endpoint to detect and process no-shows
 * Should be called every 5-15 minutes via Vercel Cron
 */
export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (process.env.VERCEL_CRON_SECRET && authHeader !== `Bearer ${process.env.VERCEL_CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const config = getSupabaseConfig()
    const supabase = createClient(config.url, config.secretKey || config.publishableKey)

    // Detect no-shows using database function
    const { data: noShows, error: detectError } = await supabase.rpc('detect_no_shows')

    if (detectError) {
      console.error('Error detecting no-shows:', detectError)
      return NextResponse.json(
        { error: 'Failed to detect no-shows', details: detectError.message },
        { status: 500 }
      )
    }

    if (!noShows || noShows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No no-shows detected',
        processed: 0
      })
    }

    const processed = []
    const errors = []

    // Process each no-show
    for (const noShow of noShows) {
      try {
        // Create no-show event
        const { data: noShowEvent, error: eventError } = await supabase
          .from('no_show_events')
          .insert({
            booking_id: noShow.booking_id,
            customer_id: noShow.customer_id,
            provider_id: noShow.provider_id,
            scheduled_time: noShow.scheduled_time,
            detected_at: new Date().toISOString()
          })
          .select()
          .single()

        if (eventError) {
          errors.push({ booking_id: noShow.booking_id, error: eventError.message })
          continue
        }

        // Update booking status to no_show
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            status: 'no_show',
            updated_at: new Date().toISOString()
          })
          .eq('id', noShow.booking_id)

        if (updateError) {
          errors.push({ booking_id: noShow.booking_id, error: updateError.message })
          continue
        }

        // Automatically create dispute for no-show
        const { data: disputeId, error: disputeError } = await supabase.rpc(
          'auto_create_no_show_dispute',
          {
            p_booking_id: noShow.booking_id,
            p_no_show_event_id: noShowEvent.id
          }
        )

        if (disputeError) {
          console.error(`Failed to create dispute for booking ${noShow.booking_id}:`, disputeError)
          errors.push({ booking_id: noShow.booking_id, error: `Dispute creation failed: ${disputeError.message}` })
        }

        // Send notifications
        await supabase.from('admin_notifications').insert([
          {
            type: 'no_show_detected',
            title: 'No-Show Detected',
            message: `Booking ${noShow.booking_id} marked as no-show. Dispute created automatically.`,
            metadata: {
              booking_id: noShow.booking_id,
              dispute_id: disputeId,
              no_show_event_id: noShowEvent.id
            },
            priority: 'high',
            created_at: new Date().toISOString()
          }
        ])

        processed.push({
          booking_id: noShow.booking_id,
          dispute_id: disputeId,
          no_show_event_id: noShowEvent.id
        })
      } catch (error) {
        errors.push({
          booking_id: noShow.booking_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processed.length} no-show(s)`,
      processed: processed.length,
      errors: errors.length,
      details: {
        processed,
        errors: errors.length > 0 ? errors : undefined
      }
    })
  } catch (error) {
    console.error('No-show detection cron error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

