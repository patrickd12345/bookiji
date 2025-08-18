import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

export async function GET() {
  try {
    const { url, secretKey } = getSupabaseConfig()
    if (!secretKey) {
      return NextResponse.json({ error: 'No secret key available' }, { status: 500 })
    }

    const admin = createClient(url, secretKey, { auth: { persistSession: false } })

    // Get reschedule metrics
    const { data: rescheduleMetrics, error: metricsError } = await admin
      .from('bookings')
      .select('status, reschedule_in_progress, reschedule_hold_expires_at, created_at, replaced_by_booking_id')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

    if (metricsError) {
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
    }

    // Calculate metrics
    const totalBookings = rescheduleMetrics.length
    const rescheduleInitiations = rescheduleMetrics.filter(b => b.reschedule_in_progress).length
    const abandonedReschedules = rescheduleMetrics.filter(b => 
      b.reschedule_in_progress && 
      b.reschedule_hold_expires_at && 
      new Date(b.reschedule_hold_expires_at) < new Date()
    ).length
    const completedReschedules = rescheduleMetrics.filter(b => 
      b.status === 'cancelled' && 
      b.replaced_by_booking_id
    ).length

    const abandonmentRate = totalBookings > 0 ? (abandonedReschedules / rescheduleInitiations) * 100 : 0
    const completionRate = rescheduleInitiations > 0 ? (completedReschedules / rescheduleInitiations) * 100 : 0

    // Check for alert conditions
    const alerts = []
    if (abandonmentRate > 5) {
      alerts.push({
        level: 'warning',
        message: `High reschedule abandonment rate: ${abandonmentRate.toFixed(1)}%`,
        threshold: '5%'
      })
    }

    if (rescheduleInitiations > 0 && completionRate < 80) {
      alerts.push({
        level: 'warning',
        message: `Low reschedule completion rate: ${completionRate.toFixed(1)}%`,
        threshold: '80%'
      })
    }

    return NextResponse.json({
      success: true,
      metrics: {
        totalBookings,
        rescheduleInitiations,
        abandonedReschedules,
        completedReschedules,
        abandonmentRate: Math.round(abandonmentRate * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100
      },
      alerts,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Reschedule metrics error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch metrics', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
