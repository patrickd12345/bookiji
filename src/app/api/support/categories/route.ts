import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabaseClient'

/**
 * GET /api/support/categories
 */
export async function GET(_request: NextRequest) {
  const supabase = createSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('support_categories')
      .select('id,name,icon,description,priority')
      .order('priority', { ascending: true })
    if (error) throw error

    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    console.error('[support/categories] error', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
} 