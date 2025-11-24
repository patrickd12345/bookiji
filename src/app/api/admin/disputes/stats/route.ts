import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseConfig } from '@/lib/supabase/config'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const cookieStore = cookies()
    const config = getSupabaseConfig()
    const supabase = createServerClient(
      config.url,
      config.publishableKey,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          }
        }
      }
    )

    // Get total disputes
    const { count: total } = await supabase
      .from('disputes')
      .select('*', { count: 'exact', head: true })

    // Get disputes by status
    const { count: pending } = await supabase
      .from('disputes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    const { count: underReview } = await supabase
      .from('disputes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'under_review')

    const { count: resolved } = await supabase
      .from('disputes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'resolved')

    // Get disputes by type
    const { count: noShow } = await supabase
      .from('disputes')
      .select('*', { count: 'exact', head: true })
      .eq('dispute_type', 'no_show')

    return NextResponse.json({
      success: true,
      stats: {
        total: total || 0,
        pending: pending || 0,
        under_review: underReview || 0,
        resolved: resolved || 0,
        no_show: noShow || 0
      }
    })
  } catch (error) {
    console.error('Admin disputes stats error:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

