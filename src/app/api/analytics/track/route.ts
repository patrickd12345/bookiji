import { NextRequest, NextResponse } from 'next/server'
import { limitRequest } from '@/middleware/requestLimiter'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

type SupabaseClient = ReturnType<typeof createClient>

// Lazy Supabase client creation to avoid build-time errors
function createSupabaseClient(): SupabaseClient {
  const config = getSupabaseConfig()
  
  return createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  })
}

interface EventProperties {
  session_id?: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  server_timestamp?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  country?: string;
  is_mobile?: boolean;
  is_bot?: boolean;
  completed_bookings?: number;
  session_duration?: number;
  help_clicks?: number;
  signup_abandoned?: boolean;
  payment_abandoned?: boolean;
  pricing_page_visits?: number;
  session_count?: number;
  [key: string]: unknown;
}

interface EnhancedEvent {
  event_name: string;
  properties: EventProperties;
  created_at: string;
  [key: string]: unknown;
}

interface AnalyticsResponse {
  success: boolean;
  event_id?: string;
  error?: string;
  data?: unknown;
}

// 📊 Analytics tracking endpoint for post-launch optimization
export async function POST(request: NextRequest) {
  try {
    const limited = limitRequest(request, { windowMs: 10_000, max: 30 })
    if (limited) return limited
    const { event, properties } = await request.json()
    
    if (!event) {
      return NextResponse.json({ error: 'Event name is required' }, { status: 400 })
    }

    const supabase = createSupabaseClient()
    const userAgent = request.headers.get('user-agent') || ''
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    
    // Enhanced event data with server-side enrichment
    const enhancedEvent: EnhancedEvent = {
      event_name: event,
      properties: {
        ...properties,
        ip_address: clientIp,
        user_agent: userAgent,
        server_timestamp: new Date().toISOString(),
        session_id: properties.session_id || generateSessionId(),
        device_type: getDeviceType(userAgent),
        browser: getBrowser(userAgent),
        os: getOperatingSystem(userAgent),
        country: await getCountryFromIP(),
        is_mobile: isMobileDevice(userAgent),
        is_bot: isBotTraffic(userAgent)
      },
      created_at: new Date().toISOString()
    }

    // Store raw event data
    const { error: eventError } = await supabase
      .from('analytics_events')
      .insert([enhancedEvent as Record<string, unknown>])

    if (eventError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to store analytics event:', eventError)
      }
      return NextResponse.json({ error: 'Failed to store event' }, { status: 500 })
    }

    // Process conversion funnel events
    if (event.startsWith('funnel_')) {
      await processFunnelEvent(supabase, event, enhancedEvent.properties)
    }

    // Process user behavior for segmentation
    if (shouldTriggerSegmentation(event)) {
      await updateUserSegmentation(supabase, enhancedEvent.properties)
    }

    // Track geographic patterns
    if (enhancedEvent.properties.country && enhancedEvent.properties.country !== 'unknown') {
      await updateGeographicStats(supabase, enhancedEvent.properties.country, event)
    }

    // Real-time alerts for critical events
    if (isCriticalEvent(event)) {
      await sendRealTimeAlert(event, enhancedEvent.properties)
    }

    return NextResponse.json({ 
      success: true, 
      event_id: enhancedEvent.properties.session_id 
    })

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Analytics tracking error:', error)
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions for advanced analytics processing

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function getDeviceType(userAgent: string): string {
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) return 'mobile'
  return 'desktop'
}

function getBrowser(userAgent: string): string {
  if (userAgent.includes('Chrome')) return 'Chrome'
  if (userAgent.includes('Firefox')) return 'Firefox'
  if (userAgent.includes('Safari')) return 'Safari'
  if (userAgent.includes('Edge')) return 'Edge'
  if (userAgent.includes('Opera')) return 'Opera'
  return 'Unknown'
}

function getOperatingSystem(userAgent: string): string {
  if (userAgent.includes('Windows')) return 'Windows'
  if (userAgent.includes('Mac OS')) return 'macOS'
  if (userAgent.includes('Linux')) return 'Linux'
  if (userAgent.includes('Android')) return 'Android'
  if (userAgent.includes('iOS')) return 'iOS'
  return 'Unknown'
}

function isMobileDevice(userAgent: string): boolean {
  return /mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)
}

function isBotTraffic(userAgent: string): boolean {
  return /bot|crawler|spider|crawling/i.test(userAgent)
}

async function getCountryFromIP(): Promise<string> {
  // In production, you'd use a service like MaxMind, IPinfo, or similar
  // For now, return 'unknown' - this can be enhanced later
  try {
    // Example with IPinfo (you'd need to sign up and get an API key)
    // const response = await fetch(`https://ipinfo.io/${clientIp}?token=${process.env.IPINFO_TOKEN}`)
    // const data = await response.json()
    // return data.country || 'unknown'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

async function processFunnelEvent(supabase: SupabaseClient, event: string, properties: EventProperties) {
  try {
    const [, funnelName, step] = event.split('_')
    
    const { error } = await supabase
      .from('conversion_funnels')
      .upsert({
        funnel_name: funnelName,
        step_name: step,
        user_id: properties.user_id || 'anonymous',
        session_id: properties.session_id,
        properties,
        created_at: new Date().toISOString()
      })

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to process funnel event:', error)
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Funnel processing error:', error)
    }
  }
}

function shouldTriggerSegmentation(event: string): boolean {
  const segmentationTriggers = [
    'signup_completed',
    'booking_completed',
    'payment_failed',
    'help_accessed',
    'confusion_detected',
    'feature_discovered'
  ]
  return segmentationTriggers.includes(event)
}

async function updateUserSegmentation(supabase: SupabaseClient, properties: EventProperties) {
  try {
    if (!properties.user_id) return

    // Get user's current behavior data
    const { data: userData } = await supabase
      .from('user_analytics')
      .select('*')
      .eq('user_id', properties.user_id)
      .single()

    // Calculate user segments based on behavior
    const segments = []
    
    if ((userData?.completed_bookings as number) >= 3 || (userData?.session_duration as number) > 600) {
      segments.push('power_user')
    }
    
    if ((userData?.help_clicks as number) > 2 || userData?.signup_abandoned) {
      segments.push('confused_user')
    }
    
    if (userData?.payment_abandoned || (userData?.pricing_page_visits as number) > 3) {
      segments.push('price_sensitive')
    }
    
    if (properties.country && !['US', 'GB', 'AU'].includes(properties.country)) {
      segments.push('international_user')
    }
    
    if (properties.is_mobile && (userData?.session_count as number) > 2) {
      segments.push('mobile_user')
    }

    // Update user segments
    await supabase
      .from('user_segments')
      .upsert({
        user_id: properties.user_id,
        segments,
        last_updated: new Date().toISOString()
      })

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('User segmentation error:', error)
    }
  }
}

async function updateGeographicStats(supabase: SupabaseClient, country: string, event: string) {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // Call the stored procedure we created
    const { error } = await supabase
      .rpc('increment_geographic_stats', {
        p_country: country,
        p_date: today,
        p_event_name: event
      })

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Geographic stats update error:', error)
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Geographic analytics error:', error)
    }
  }
}

function isCriticalEvent(event: string): boolean {
  const criticalEvents = [
    'payment_failed',
    'booking_abandoned',
    'error_encountered',
    'confusion_detected'
  ]
  return criticalEvents.includes(event)
}

async function sendRealTimeAlert(event: string, properties: EventProperties): Promise<void> {
  try {
    // Example: Send to a webhook or notification service
    const alertPayload = {
      event,
      properties,
      timestamp: new Date().toISOString(),
      priority: event.includes('error') ? 'high' : 'medium'
    }

    // In production, you'd send this to your alert system
    console.log('🚨 Real-time alert:', alertPayload)
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to send real-time alert:', error)
    }
  }
}

// Analytics data retrieval endpoints
export async function GET(request: NextRequest): Promise<NextResponse<AnalyticsResponse>> {
  try {
    const limited = limitRequest(request, { windowMs: 10_000, max: 60 })
    if (limited) return limited as NextResponse<AnalyticsResponse>
    const supabase = createSupabaseClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    let data: unknown

    switch (type) {
      case 'funnel':
        data = await getFunnelAnalytics(supabase)
        break
      case 'geographic':
        data = await getGeographicAnalytics(supabase)
        break
      case 'segments':
        data = await getUserSegmentAnalytics(supabase)
        break
      case 'events':
        data = await getEventAnalytics(supabase)
        break
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid analytics type' 
        }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Analytics retrieval error:', error)
    }
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to retrieve analytics' 
    }, { status: 500 })
  }
}

async function getFunnelAnalytics(supabase: SupabaseClient) {
  const funnelName = 'booking'
  const days = 7
  
  const { data, error } = await supabase
    .from('conversion_funnels')
    .select('*')
    .eq('funnel_name', funnelName)
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to get funnel data' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

async function getGeographicAnalytics(supabase: SupabaseClient) {
  const days = 7
  
  const { data, error } = await supabase
    .from('geographic_analytics')
    .select('*')
    .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('event_count', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to get geographic data' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

async function getUserSegmentAnalytics(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('user_segments')
    .select(`
      segments,
      count(*) as segment_count
    `)
    .order('segment_count', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to get segment data' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

async function getEventAnalytics(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('analytics_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to fetch event analytics:', error)
    }
    return { error: 'Failed to fetch event analytics' }
  }

  return { data }
} 