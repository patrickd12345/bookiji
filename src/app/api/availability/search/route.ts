import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'
import { checkServiceRequestLimit } from '@/lib/utils/rateLimiter'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>

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
        // Calculate optimal radius based on provider density
        const calculateRadiusZone = async (lat: number, lng: number) => {
          // Get counts at different radii to determine density
          const [twoKm, fiveKm] = await Promise.all([
            supabase.rpc('get_providers_within_radius', {
              p_latitude: lat,
              p_longitude: lng,
              p_radius_km: 2
            }),
            supabase.rpc('get_providers_within_radius', {
              p_latitude: lat,
              p_longitude: lng,
              p_radius_km: 5
            })
          ]);

          const twoKmCount = twoKm.data?.length || 0;
          const fiveKmCount = fiveKm.data?.length || 0;

          if (twoKmCount >= 8) {
            return { radius: 2, density: 'dense' };
          } else if (fiveKmCount >= 4) {
            return { radius: 5, density: 'medium' };
          } else {
            return { radius: 10, density: 'sparse' };
          }
        };

        // Get optimal radius for this location
        const radiusZone = await calculateRadiusZone(customerLocation.lat, customerLocation.lng);
        const optimalRadius = radiusZone.radius;

        // Try AI-powered radius scaling for even better optimization
        let recommendedRadius = optimalRadius;
        try {
          const aiRadiusResponse = await fetch(`${req.nextUrl.origin}/api/ai-radius-scaling`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              service: serviceDetails,
              location: customerLocation,
              providerDensity: radiusZone.density,
              currentRadius: optimalRadius
            })
          });

          if (aiRadiusResponse.ok) {
            const aiData = await aiRadiusResponse.json();
            if (aiData.success && aiData.recommendedRadius) {
              recommendedRadius = aiData.recommendedRadius;
            }
          }
        } catch (aiError) {
          console.log('AI radius scaling failed, using density-based radius:', aiError);
          // Fall back to density-based radius
        }

        // Spam control: Check rate limit for service requests
        // Note: In a real implementation, we'd get userId from auth
        // For now, we'll use a session-based identifier
        const rateLimitKey = `service_request:${customerLocation.lat},${customerLocation.lng}`
        const rateLimit = checkServiceRequestLimit(rateLimitKey, {
          serviceDetails,
          desiredDateTime,
        })

        if (!rateLimit.allowed) {
          return NextResponse.json({
            success: true,
            slots: [],
            rateLimited: true,
            message: 'Too many service requests. Please wait before requesting again.',
            retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
          })
        }

        // Check for duplicate requests (deduplication)
        const { data: recentRequests } = await supabase
          .from('service_requests')
          .select('id, created_at')
          .eq('service_details', serviceDetails)
          .eq('desired_datetime', desiredDateTime)
          .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
          .limit(1)

        if (recentRequests && recentRequests.length > 0) {
          // Duplicate request detected - return existing result without creating new request
          return NextResponse.json({
            success: true,
            slots: [],
            broadcasted: true,
            duplicate: true,
            message: 'Similar request already submitted recently',
          })
        }

        // Create service request
        await supabase.from('service_requests').insert({
          service_details: serviceDetails,
          desired_datetime: desiredDateTime,
          customer_lat: customerLocation.lat,
          customer_lng: customerLocation.lng,
          status: 'pending'
        })

        // Find vendors within the optimal dynamic radius
        const { data: providers } = await supabase.rpc('get_providers_within_radius', {
          p_latitude: customerLocation.lat,
          p_longitude: customerLocation.lng,
          p_radius_km: recommendedRadius
        })

        const notificationUrl = new URL('/api/notifications/send', req.url)

        await Promise.all(
          (providers || []).map((p: { user_id?: string; id?: string }) =>
            fetch(notificationUrl.toString(), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'push',
                recipient: p.user_id || p.id,
                template: 'admin_alert',
                data: {
                  message: `New service request for ${serviceDetails} at ${desiredDateTime} within ${recommendedRadius}km`
                }
              })
            }).catch((err) => console.error('Failed to send notification', err))
          )
        )

        return NextResponse.json({ 
          success: true, 
          broadcasted: true,
          radiusUsed: recommendedRadius,
          providerDensity: radiusZone.density,
          providersNotified: providers?.length || 0
        })
      } catch (requestError) {
        console.error('Failed to create service request:', requestError)
        return NextResponse.json({ success: true, broadcasted: false })
      }
    }

    // Graceful empty result state with suggestions
    if (!slots || slots.length === 0) {
      return NextResponse.json({
        success: true,
        slots: [],
        empty: true,
        suggestions: {
          message: 'No available slots found for your search criteria.',
          actions: [
            'Try adjusting your date range',
            'Expand your search radius',
            'Create a service request to be notified when slots become available',
          ],
          createRequestUrl: '/requests',
        },
      })
    }

    return NextResponse.json({ success: true, slots: slots || [] })
  } catch (err) {
    console.error('availability search error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
