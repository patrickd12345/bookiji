/**
 * Jarvis Chat API
 * 
 * POST /api/jarvis/chat
 * 
 * Allows admins to chat with Jarvis about Bookiji state, stats, incidents, etc.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers'
import { getIncidentSnapshot } from '@/lib/jarvis/incidentSnapshot'
import { getIncidentStatusSnapshot } from '@/lib/jarvis/status/getIncidentSnapshot'
import { getServerSupabase } from '@/lib/supabaseServer'
import { getAppEnv } from '@/lib/env/assertAppEnv'

/**
 * Check if user is admin
 */
async function checkAdmin(): Promise<boolean> {
  try {
    const config = getSupabaseConfig()
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      config.url,
      config.publishableKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // No-op for route handlers
          }
        }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return false
    }

    // Check profiles table for admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle()
    
    if (profile?.role === 'admin') {
      return true
    }

    // Check user_roles table
    const { data: appUser } = await supabase
      .from('app_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (appUser?.id) {
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('app_user_id', appUser.id)
        .eq('role', 'admin')
        .maybeSingle()

      if (userRole?.role === 'admin') {
        return true
      }
    }

    return false
  } catch {
    return false
  }
}

/**
 * Gather Bookiji state and stats for chat context
 */
async function gatherBookijiState() {
  const supabase = getServerSupabase()
  const env = getAppEnv() || 'local'
  
  try {
    // Gather various stats in parallel
    const [
      bookingsStats,
      usersStats,
      vendorsStats,
      recentIncidents,
      systemFlags,
      currentSnapshot
    ] = await Promise.allSettled([
      // Bookings stats
      supabase
        .from('bookings')
        .select('id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(100),
      
      // Users stats
      supabase
        .from('profiles')
        .select('id, role, created_at')
        .limit(100),
      
      // Vendors stats
      supabase
        .from('vendors')
        .select('id, status, created_at')
        .limit(100),
      
      // Recent incidents
      supabase
        .from('jarvis_incidents')
        .select('incident_id, severity, sent_at, resolved, env')
        .order('sent_at', { ascending: false })
        .limit(10),
      
      // System flags
      supabase
        .from('system_flags')
        .select('key, value'),
      
      // Current system snapshot
      getIncidentSnapshot().catch(() => null)
    ])

    // Process bookings stats
    const bookings = bookingsStats.status === 'fulfilled' && bookingsStats.value.data
      ? bookingsStats.value.data
      : []
    
    const bookingsByStatus = bookings.reduce((acc: Record<string, number>, b: any) => {
      acc[b.status] = (acc[b.status] || 0) + 1
      return acc
    }, {})

    const recentBookings = bookings.filter((b: any) => {
      const createdAt = new Date(b.created_at)
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
      return createdAt.getTime() > oneDayAgo
    }).length

    // Process users stats
    const users = usersStats.status === 'fulfilled' && usersStats.value.data
      ? usersStats.value.data
      : []
    
    const usersByRole = users.reduce((acc: Record<string, number>, u: any) => {
      acc[u.role || 'customer'] = (acc[u.role || 'customer'] || 0) + 1
      return acc
    }, {})

    // Process vendors stats
    const vendors = vendorsStats.status === 'fulfilled' && vendorsStats.value.data
      ? vendorsStats.value.data
      : []
    
    const vendorsByStatus = vendors.reduce((acc: Record<string, number>, v: any) => {
      acc[v.status || 'active'] = (acc[v.status || 'active'] || 0) + 1
      return acc
    }, {})

    // Process incidents
    const incidents = recentIncidents.status === 'fulfilled' && recentIncidents.value.data
      ? recentIncidents.value.data
      : []
    
    const unresolvedIncidents = incidents.filter((i: any) => !i.resolved).length
    const sev1Incidents = incidents.filter((i: any) => i.severity === 'SEV-1').length

    // Process system flags
    const flags = systemFlags.status === 'fulfilled' && systemFlags.value.data
      ? systemFlags.value.data.reduce((acc: Record<string, any>, f: any) => {
          acc[f.key] = f.value
          return acc
        }, {})
      : {}

    // Get current incident status if available
    const ownerPhone = process.env.JARVIS_OWNER_PHONE || ''
    const currentIncident = ownerPhone 
      ? await getIncidentStatusSnapshot(ownerPhone).catch(() => null)
      : null

    return {
      environment: env,
      timestamp: new Date().toISOString(),
      bookings: {
        total_recent: recentBookings,
        by_status: bookingsByStatus,
        total_sampled: bookings.length
      },
      users: {
        total_sampled: users.length,
        by_role: usersByRole
      },
      vendors: {
        total_sampled: vendors.length,
        by_status: vendorsByStatus
      },
      incidents: {
        recent_count: incidents.length,
        unresolved: unresolvedIncidents,
        sev1_count: sev1Incidents,
        recent: incidents.slice(0, 5).map((i: any) => ({
          id: i.incident_id,
          severity: i.severity,
          sent_at: i.sent_at,
          resolved: i.resolved,
          env: i.env
        }))
      },
      system: {
        flags: flags,
        scheduling_enabled: flags.scheduling_enabled !== false,
        current_snapshot: currentSnapshot.status === 'fulfilled' ? currentSnapshot.value : null,
        current_incident: currentIncident
      }
    }
  } catch (error) {
    console.error('[Jarvis Chat] Error gathering state:', error)
    return {
      environment: env,
      timestamp: new Date().toISOString(),
      error: 'Failed to gather some state information'
    }
  }
}

/**
 * Generate chat response using LLM
 */
async function generateChatResponse(query: string, context: any): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY
  const model = process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini'
  const baseUrl = process.env.GROQ_API_KEY 
    ? 'https://api.groq.com/openai/v1'
    : 'https://api.openai.com/v1'

  if (!apiKey) {
    return `I'm Jarvis, Bookiji's incident commander. I can help you understand system state, but I need an LLM API key configured (GROQ_API_KEY or OPENAI_API_KEY) to answer questions intelligently.

Current system state:
- Environment: ${context.environment}
- Scheduling enabled: ${context.system?.scheduling_enabled !== false}
- Recent incidents: ${context.incidents?.recent_count || 0}
- Unresolved incidents: ${context.incidents?.unresolved || 0}

You asked: "${query}"

Without LLM, I can only provide raw data. Please configure an API key for intelligent responses.`
  }

  const systemPrompt = `You are Jarvis, Bookiji's autonomous incident commander and system monitor. You're now chatting with an admin who wants to understand Bookiji's state, stats, incidents, or system health.

Your role:
- Answer questions about Bookiji's current state, statistics, incidents, and system health
- Be concise but informative
- Use the provided context data to answer accurately
- If you don't have information, say so clearly
- Be helpful and professional
- You can discuss incidents, system flags, booking stats, user stats, vendor stats, etc.

Context provided:
${JSON.stringify(context, null, 2)}

Answer the admin's question based on this context. Be natural and conversational.`

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`LLM API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || 'I apologize, but I could not generate a response.'
  } catch (error) {
    console.error('[Jarvis Chat] LLM error:', error)
    return `I encountered an error while processing your question: ${error instanceof Error ? error.message : 'Unknown error'}. 

Here's what I know from the current state:
- Environment: ${context.environment}
- Scheduling enabled: ${context.system?.scheduling_enabled !== false}
- Recent incidents: ${context.incidents?.recent_count || 0}
- Unresolved incidents: ${context.incidents?.unresolved || 0}`
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const isAdmin = await checkAdmin()
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { message } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Gather current Bookiji state
    const context = await gatherBookijiState()

    // Generate response using LLM
    const response = await generateChatResponse(message, context)

    return NextResponse.json({
      response,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Jarvis Chat] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
