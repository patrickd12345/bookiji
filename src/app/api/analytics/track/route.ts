import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

interface AnalyticsEvent {
  event_type: string
  user_id?: string
  session_id: string
  page_url: string
  user_agent: string
  timestamp: string
  properties?: Record<string, any>
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      event_type,
      user_id,
      session_id,
      page_url,
      properties = {},
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term
    } = body

    // Validate required fields
    if (!event_type || !session_id || !page_url) {
      return NextResponse.json(
        { error: 'Missing required fields: event_type, session_id, page_url' },
        { status: 400 }
      )
    }

    // Get user agent and IP
    const user_agent = request.headers.get('user-agent') || 'Unknown'
    const ip_address = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'Unknown'

    // Create analytics event
    const analyticsEvent: AnalyticsEvent = {
      event_type,
      user_id: user_id || null,
      session_id,
      page_url,
      user_agent,
      timestamp: new Date().toISOString(),
      properties: {
        ...properties,
        ip_address,
        referrer: request.headers.get('referer') || null
      },
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      utm_content: utm_content || null,
      utm_term: utm_term || null
    }

    // Store in database
    const { error } = await supabase
      .from('analytics_events')
      .insert([analyticsEvent])

    if (error) {
      console.error('Analytics storage error:', error)
      // Don't fail the request, just log the error
    }

    // Process specific event types for business intelligence
    await processSpecialEvents(event_type, properties, user_id)

    return NextResponse.json({ 
      success: true,
      message: 'Event tracked successfully' 
    })

  } catch (error) {
    console.error('Analytics tracking error:', error)
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    )
  }
}

async function processSpecialEvents(
  event_type: string, 
  properties: Record<string, any>, 
  user_id?: string
) {
  try {
    switch (event_type) {
      case 'booking_started':
        // Track booking funnel conversion
        await supabase
          .from('funnel_analytics')
          .insert({
            user_id,
            funnel_step: 'booking_started',
            vendor_id: properties.vendor_id,
            service_id: properties.service_id,
            timestamp: new Date().toISOString()
          })
        break

      case 'payment_initiated':
        // Track payment funnel
        await supabase
          .from('funnel_analytics')
          .insert({
            user_id,
            funnel_step: 'payment_initiated',
            booking_id: properties.booking_id,
            amount: properties.amount,
            timestamp: new Date().toISOString()
          })
        break

      case 'booking_completed':
        // Track successful conversions
        await supabase
          .from('conversion_analytics')
          .insert({
            user_id,
            booking_id: properties.booking_id,
            vendor_id: properties.vendor_id,
            service_id: properties.service_id,
            amount: properties.amount,
            conversion_time: properties.time_to_convert,
            timestamp: new Date().toISOString()
          })
        break

      case 'page_view':
        // Track popular pages
        await supabase
          .from('page_analytics')
          .upsert({
            page_url: properties.page_url,
            view_count: 1,
            last_viewed: new Date().toISOString()
          }, {
            onConflict: 'page_url',
            ignoreDuplicates: false
          })
        break

      case 'vendor_signup':
        // Track vendor acquisition
        await supabase
          .from('vendor_analytics')
          .insert({
            vendor_id: properties.vendor_id,
            signup_source: properties.source,
            business_type: properties.business_type,
            timestamp: new Date().toISOString()
          })
        break

      case 'search_performed':
        // Track search behavior
        await supabase
          .from('search_analytics')
          .insert({
            user_id,
            search_query: properties.query,
            search_location: properties.location,
            results_count: properties.results_count,
            clicked_result: properties.clicked_result || null,
            timestamp: new Date().toISOString()
          })
        break
    }
  } catch (error) {
    console.error('Special event processing error:', error)
    // Don't throw, just log
  }
}

// GET endpoint for analytics data retrieval
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const vendorId = searchParams.get('vendor_id')

    if (!metric) {
      return NextResponse.json(
        { error: 'Metric parameter required' },
        { status: 400 }
      )
    }

    let query = supabase.from('analytics_events').select('*')

    // Apply filters
    if (startDate) {
      query = query.gte('timestamp', startDate)
    }
    if (endDate) {
      query = query.lte('timestamp', endDate)
    }
    if (vendorId) {
      query = query.eq('properties->>vendor_id', vendorId)
    }

    // Specific metric queries
    switch (metric) {
      case 'conversion_rate':
        const { data: conversionData } = await supabase.rpc('calculate_conversion_rate', {
          start_date: startDate || '2025-01-01',
          end_date: endDate || new Date().toISOString(),
          vendor_id_param: vendorId
        })
        return NextResponse.json({ data: conversionData })

      case 'popular_services':
        const { data: servicesData } = await supabase
          .from('analytics_events')
          .select('properties')
          .eq('event_type', 'booking_completed')
          .gte('timestamp', startDate || '2025-01-01')
          .lte('timestamp', endDate || new Date().toISOString())
        
        // Process service popularity
        const serviceStats = servicesData?.reduce((acc: any, event: any) => {
          const serviceId = event.properties?.service_id
          if (serviceId) {
            acc[serviceId] = (acc[serviceId] || 0) + 1
          }
          return acc
        }, {})

        return NextResponse.json({ data: serviceStats })

      case 'traffic_sources':
        const { data: trafficData } = await supabase
          .from('analytics_events')
          .select('utm_source, utm_medium, utm_campaign')
          .eq('event_type', 'page_view')
          .gte('timestamp', startDate || '2025-01-01')
          .lte('timestamp', endDate || new Date().toISOString())

        return NextResponse.json({ data: trafficData })

      default:
        const { data, error } = await query
        if (error) throw error
        return NextResponse.json({ data })
    }

  } catch (error) {
    console.error('Analytics retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve analytics' },
      { status: 500 }
    )
  }
} 