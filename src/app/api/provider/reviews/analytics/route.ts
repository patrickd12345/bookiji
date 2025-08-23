import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('provider_id')
    const timeRange = searchParams.get('time_range') || '30d'

    if (!providerId) {
      return NextResponse.json(
        { error: 'provider_id is required' },
        { status: 400 }
      )
    }

    // Calculate date range
    const now = new Date()
    let startDate: Date
    
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Get analytics from the view
    const { data: analytics, error: analyticsError } = await supabase
      .from('provider_review_analytics')
      .select('*')
      .eq('provider_id', providerId)
      .single()

    if (analyticsError) {
      console.error('Analytics fetch error:', analyticsError)
      return NextResponse.json(
        { error: 'Failed to fetch analytics' },
        { status: 500 }
      )
    }

    // Get rating distribution
    const { data: distribution, error: distributionError } = await supabase
      .from('review_distribution_analytics')
      .select('*')
      .eq('provider_id', providerId)
      .order('rating', { ascending: false })

    if (distributionError) {
      console.error('Distribution fetch error:', distributionError)
      return NextResponse.json(
        { error: 'Failed to fetch distribution' },
        { status: 500 }
      )
    }

    // Get review trends over time
    const { data: trends, error: trendsError } = await supabase
      .from('reviews')
      .select('created_at, overall_quality, rating')
      .eq('provider_id', providerId)
      .eq('status', 'published')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (trendsError) {
      console.error('Trends fetch error:', trendsError)
      return NextResponse.json(
        { error: 'Failed to fetch trends' },
        { status: 500 }
      )
    }

    // Process trends data
    const trendsMap = new Map<string, { count: number; totalRating: number }>()
    
    trends?.forEach(review => {
      const date = new Date(review.created_at).toISOString().split('T')[0]
      const rating = review.overall_quality || review.rating
      
      if (trendsMap.has(date)) {
        const existing = trendsMap.get(date)!
        existing.count++
        existing.totalRating += rating
      } else {
        trendsMap.set(date, { count: 1, totalRating: rating })
      }
    })

    const processedTrends = Array.from(trendsMap.entries()).map(([date, data]) => ({
      date,
      count: data.count,
      avg_rating: data.totalRating / data.count
    }))

    // Get recent reviews for additional insights
    const { data: recentReviews, error: recentError } = await supabase
      .from('reviews')
      .select('rating, overall_quality, would_recommend, created_at')
      .eq('provider_id', providerId)
      .eq('status', 'published')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(100)

    if (recentError) {
      console.error('Recent reviews fetch error:', recentError)
      return NextResponse.json(
        { error: 'Failed to fetch recent reviews' },
        { status: 500 }
      )
    }

    // Calculate additional metrics
    const totalReviews = recentReviews?.length || 0
    const positiveReviews = recentReviews?.filter(r => (r.overall_quality || r.rating) >= 4.0).length || 0
    const negativeReviews = recentReviews?.filter(r => (r.overall_quality || r.rating) <= 2.0).length || 0
    const neutralReviews = recentReviews?.filter(r => {
      const rating = r.overall_quality || r.rating
      return rating > 2.0 && rating < 4.0
    }).length || 0

    const recommendationCount = recentReviews?.filter(r => r.would_recommend === true).length || 0
    const recommendationPercentage = totalReviews > 0 ? (recommendationCount / totalReviews) * 100 : 0

    // Enhance analytics with calculated values
    const enhancedAnalytics = {
      ...analytics,
      positive_reviews: positiveReviews,
      negative_reviews: negativeReviews,
      neutral_reviews: neutralReviews,
      recommendation_count: recommendationCount,
      recommendation_percentage: Math.round(recommendationPercentage * 10) / 10
    }

    return NextResponse.json({
      analytics: enhancedAnalytics,
      distribution: distribution || [],
      trends: processedTrends,
      timeRange,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Provider analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

