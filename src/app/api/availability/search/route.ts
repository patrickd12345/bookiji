import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

// Free availability search: no payment intent required
export async function POST(req: NextRequest) {
  try {
    const {
      providerId,
      date,
      serviceDetails,
      desiredDateTime,
      customerLocation
    } = await req.json()

    if (!providerId) {
      return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })
    }

    // Fetch all open slots for the provider on or after the specified date
    const { data: slots, error } = await supabase
      .from('availability_slots')
      .select('id, start_time, end_time')
      .eq('provider_id', providerId)
      .eq('is_booked', false)
      .gte('start_time', date ? `${date}T00:00:00Z` : new Date().toISOString())
      .order('start_time')

    if (error) {
      console.error('Error fetching slots:', error)
      return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
    }

    if ((slots?.length || 0) === 0 && serviceDetails && desiredDateTime && customerLocation) {
      try {
        await supabase.from('service_requests').insert({
          service_details: serviceDetails,
          desired_datetime: desiredDateTime,
          customer_lat: customerLocation.lat,
          customer_lng: customerLocation.lng,
          status: 'pending'
        })

        const { data: providers } = await supabase.rpc('get_providers_within_radius', {
          p_latitude: customerLocation.lat,
          p_longitude: customerLocation.lng,
          p_radius_km: 10
        })

        const notificationUrl = new URL('/api/notifications/send', req.url)

        await Promise.all(
          (providers || []).map((p: any) =>
            fetch(notificationUrl.toString(), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'push',
                recipient: p.user_id || p.id,
                template: 'admin_alert',
                data: {
                  message: `New service request for ${serviceDetails} at ${desiredDateTime}`
                }
              })
            }).catch((err) => console.error('Failed to send notification', err))
          )
        )
      } catch (requestError) {
        console.error('Failed to create service request:', requestError)
        return NextResponse.json({ success: true, broadcasted: false })
      }

      return NextResponse.json({ success: true, broadcasted: true })
    }

    return NextResponse.json({ success: true, slots: slots || [] })
  } catch (err) {
    console.error('availability search error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
