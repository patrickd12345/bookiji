import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

export async function GET(request: NextRequest) {
  try {
    const config = getSupabaseConfig()
    const supabase = createClient(config.url, config.publishableKey)

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('range') || '7d'
    const funnelType = searchParams.get('type') || 'all'
    
    // Calculate date range
    const now = new Date()
    const startDate = new Date()
    switch (timeRange) {
      case '24h':
        startDate.setHours(now.getHours() - 24)
        break
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    // Define funnel types and their steps
    const funnelDefinitions = {
      booking: ['started', 'search', 'provider_selected', 'details', 'payment', 'completed'],
      signup: ['landing', 'form_started', 'form_completed', 'email_verified', 'profile_completed'],
      provider_onboarding: ['started', 'business_info', 'services', 'availability', 'calendar', 'completed'],
      ai_chat: ['started', 'message_sent', 'response_received', 'booking_initiated']
    }

    const funnels: Array<{
      name: string
      steps: Array<{
        step: string
        count: number
        conversionRate: number
        dropoff: number
      }>
    }> = []

    // Process each funnel type
    for (const [funnelName, steps] of Object.entries(funnelDefinitions)) {
      if (funnelType !== 'all' && funnelType !== funnelName) continue

      const { data: funnelData } = await supabase
        .from('conversion_funnels')
        .select('*')
        .eq('funnel_name', funnelName)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })

      if (funnelData && funnelData.length > 0) {
        const stepCounts: Record<string, number> = {}
        
        // Count occurrences of each step
        funnelData.forEach(event => {
          const step = event.step_name
          stepCounts[step] = (stepCounts[step] || 0) + 1
        })

        // Calculate conversion rates and drop-offs
        const funnelSteps = steps.map((step, index) => {
          const count = stepCounts[step] || 0
          const previousStepCount = index > 0 ? (stepCounts[steps[index - 1]] || 0) : count
          const conversionRate = previousStepCount > 0 ? (count / previousStepCount) * 100 : 0
          const dropoff = index > 0 ? ((previousStepCount - count) / previousStepCount) * 100 : 0

          return {
            step,
            count,
            conversionRate: parseFloat(conversionRate.toFixed(1)),
            dropoff: parseFloat(dropoff.toFixed(1))
          }
        })

        funnels.push({
          name: funnelName,
          steps: funnelSteps
        })
      }
    }

    // Add overall platform funnel
    const { data: platformData } = await supabase
      .from('analytics_events')
      .select('event_name, created_at')
      .in('event_name', [
        'landing_page_viewed',
        'signup_flow_started',
        'signup_completed',
        'service_search_started',
        'provider_selected',
        'booking_confirmed'
      ])
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (platformData && platformData.length > 0) {
      const platformSteps = [
        { event: 'landing_page_viewed', step: 'Landing' },
        { event: 'signup_flow_started', step: 'Signup Started' },
        { event: 'signup_completed', step: 'Signup Complete' },
        { event: 'service_search_started', step: 'Search Started' },
        { event: 'provider_selected', step: 'Provider Selected' },
        { event: 'booking_confirmed', step: 'Booking Complete' }
      ]

      const stepCounts: Record<string, number> = {}
      platformData.forEach(event => {
        stepCounts[event.event_name] = (stepCounts[event.event_name] || 0) + 1
      })

      const platformFunnelSteps = platformSteps.map((stepInfo, index) => {
        const count = stepCounts[stepInfo.event] || 0
        const previousStepCount = index > 0 ? (stepCounts[platformSteps[index - 1].event] || 0) : count
        const conversionRate = previousStepCount > 0 ? (count / previousStepCount) * 100 : 0
        const dropoff = index > 0 ? ((previousStepCount - count) / previousStepCount) * 100 : 0

        return {
          step: stepInfo.step,
          count,
          conversionRate: parseFloat(conversionRate.toFixed(1)),
          dropoff: parseFloat(dropoff.toFixed(1))
        }
      })

      funnels.push({
        name: 'platform_overall',
        steps: platformFunnelSteps
      })
    }

    return NextResponse.json({ 
      success: true, 
      data: funnels,
      metadata: {
        timeRange,
        funnelType,
        totalFunnels: funnels.length,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Conversion funnels error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to load conversion funnels' 
    }, { status: 500 })
  }
}



