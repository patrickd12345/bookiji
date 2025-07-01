import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabaseClient'

/**
 * GET /api/support/faq?search=booking&category=<uuid>&limit=10
 * Returns published knowledge base articles matching the query.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('search') || ''
  const categoryId = searchParams.get('category')
  const limit = Number(searchParams.get('limit') || 10)

  const supabase = createSupabaseClient()

  try {
    let data
    if (query) {
      // Use full-text search RPC
      const { data: searchData, error } = await supabase.rpc('search_knowledge_base', {
        p_query: query,
        p_limit: limit
      })
      if (error) throw error
      data = searchData
    } else {
      // Simple select by category or latest featured
      let q = supabase
        .from('knowledge_base')
        .select('id,title,content,slug')
        .eq('is_published', true)
        .order('view_count', { ascending: false })
        .limit(limit)

      if (categoryId) {
        q = q.eq('category_id', categoryId)
      }

      const { data: listData, error } = await q
      if (error) throw error
      data = listData
    }

    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    console.error('[support/faq] error', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
} 