import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'

/**
 * GET /api/support/faq?search=booking&category=<uuid>&limit=10
 * Returns published knowledge base articles matching the query.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('search') || ''
  const categoryId = searchParams.get('category')
  const limit = Number(searchParams.get('limit') || 10)

  const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>

  try {
    let data
    if (query) {
      // Use full-text search - search in title and content
      let q = supabase
        .from('kb_articles')
        .select('id,title,content,url,section,locale')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (categoryId) {
        // If categoryId maps to section, filter by section
        q = q.eq('section', categoryId)
      }

      const { data: searchData, error } = await q
      if (error) throw error
      data = searchData
    } else {
      // Simple select - all published articles (all kb_articles are effectively published)
      let q = supabase
        .from('kb_articles')
        .select('id,title,content,url,section,locale')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (categoryId) {
        // If categoryId maps to section, filter by section
        q = q.eq('section', categoryId)
      }

      const { data: listData, error } = await q
      if (error) throw error
      data = listData
    }

    // Transform data to match expected format (add slug from url or id)
    const transformedData = (data || []).map((article: any) => ({
      id: article.id,
      title: article.title,
      content: article.content,
      slug: article.url || article.id, // Use url as slug, fallback to id
      section: article.section,
      locale: article.locale
    }))

    return NextResponse.json({ ok: true, data: transformedData })
  } catch (error) {
    console.error('Error fetching FAQ:', error);
    return NextResponse.json(
      { error: 'Failed to fetch FAQ', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 