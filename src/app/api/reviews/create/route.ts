import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
  updated_at: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      booking_id,
      user_id,
      vendor_id,
      rating,
      review_text,
      service_quality,
      communication,
      punctuality,
      value_for_money,
      would_recommend,
      photos
    } = body

    // Validate required fields
    if (!booking_id || !user_id || !vendor_id || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields: booking_id, user_id, vendor_id, rating' },
        { status: 400 }
      )
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Check if booking exists and belongs to user
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, vendor_id, status')
      .eq('id', booking_id)
      .eq('user_id', user_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found or access denied' },
        { status: 404 }
      )
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return NextResponse.json(
        { error: 'Can only review completed bookings' },
        { status: 400 }
      )
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', booking_id)
      .single()

    if (existingReview) {
      return NextResponse.json(
        { error: 'Review already exists for this booking' },
        { status: 409 }
      )
    }

    // Create review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        booking_id,
        user_id,
        vendor_id,
        rating,
        review_text: review_text || null,
        service_quality: service_quality || null,
        communication: communication || null,
        punctuality: punctuality || null,
        value_for_money: value_for_money || null,
        would_recommend: would_recommend !== undefined ? would_recommend : null,
        photos: photos || null,
        created_at: new Date().toISOString(),
        status: 'published',
        helpful_count: 0,
        reported_count: 0
      })
      .select()
      .single()

    if (reviewError) {
      console.error('Review creation error:', reviewError)
      return NextResponse.json(
        { error: 'Failed to create review' },
        { status: 500 }
      )
    }

    // Update vendor rating statistics
    await updateVendorRatingStats(vendor_id)

    // Send notification to vendor about new review
    await supabase
      .from('notifications')
      .insert({
        recipient_id: vendor_id,
        type: 'new_review',
        title: 'New Review Received',
        message: `You received a ${rating}-star review`,
        data: {
          review_id: review.id,
          rating,
          booking_id
        },
        created_at: new Date().toISOString()
      })

    // Track analytics
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'review_created',
        user_id,
        session_id: 'server-side',
        page_url: '/api/reviews/create',
        properties: {
          vendor_id,
          booking_id,
          rating,
          has_text: !!review_text,
          would_recommend
        }
      })
    })

    return NextResponse.json({
      success: true,
      review,
      message: 'Review created successfully'
    })

  } catch (error) {
    console.error('Review creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function updateVendorRatingStats(vendorId: string) {
  try {
    // Get all reviews for vendor
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('vendor_id', vendorId)
      .eq('status', 'published')

    if (!reviews || reviews.length === 0) return

    // Calculate statistics
    const totalReviews = reviews.length
    const averageRating = reviews.reduce((sum: number, review: { rating: number }) => sum + review.rating, 0) / totalReviews
    const ratingDistribution = {
      5: reviews.filter((r: { rating: number }) => r.rating === 5).length,
      4: reviews.filter((r: { rating: number }) => r.rating === 4).length,
      3: reviews.filter((r: { rating: number }) => r.rating === 3).length,
      2: reviews.filter((r: { rating: number }) => r.rating === 2).length,
      1: reviews.filter((r: { rating: number }) => r.rating === 1).length
    }

    // Update vendor profile
    await supabase
      .from('profiles')
      .update({
        average_rating: parseFloat(averageRating.toFixed(2)),
        total_reviews: totalReviews,
        rating_distribution: ratingDistribution,
        updated_at: new Date().toISOString()
      })
      .eq('id', vendorId)

  } catch (error) {
    console.error('Failed to update vendor rating stats:', error)
  }
}

// GET endpoint to fetch reviews
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vendorId = searchParams.get('vendor_id')
    const userId = searchParams.get('user_id')
    const bookingId = searchParams.get('booking_id')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const order = searchParams.get('order') || 'desc'

    let query = supabase
      .from('reviews')
      .select(`
        *,
        users:user_id(name, avatar_url),
        bookings:booking_id(service_name, service_date)
      `)
      .eq('status', 'published')

    // Apply filters
    if (vendorId) {
      query = query.eq('vendor_id', vendorId)
    }
    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (bookingId) {
      query = query.eq('booking_id', bookingId)
    }

    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1)

    const { data: reviews, error } = await query

    if (error) {
      console.error('Reviews fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')

    return NextResponse.json({
      reviews,
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (offset + limit) < (count || 0)
      }
    })

  } catch (error) {
    console.error('Reviews fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Calculate average rating
const calculateAverageRating = (reviews: Review[]): number => {
  return reviews.reduce((sum: number, review: Review) => {
    return sum + review.rating
  }, 0) / reviews.length
} 