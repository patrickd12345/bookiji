import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { reviewMonitoring } from '@/lib/reviewMonitoring'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      booking_id,
      reviewer_id,
      provider_id,
      rating,
      comment,
      service_quality,
      communication,
      punctuality,
      value_for_money,
      would_recommend,
      photos = []
    } = body

    // Validate required fields
    if (!booking_id || !reviewer_id || !provider_id || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate rating range (1.0 to 5.0 with half-star support)
    if (rating < 1.0 || rating > 5.0 || (rating * 2) % 1 !== 0) {
      return NextResponse.json(
        { error: 'Rating must be between 1.0 and 5.0 with half-star increments' },
        { status: 400 }
      )
    }

    // Validate detailed ratings if provided
    const detailedRatings = [service_quality, communication, punctuality, value_for_money]
    const hasDetailedRatings = detailedRatings.every(r => r !== undefined && r !== null)
    
    if (hasDetailedRatings) {
      for (const rating of detailedRatings) {
        if (rating < 1.0 || rating > 5.0 || (rating * 2) % 1 !== 0) {
          return NextResponse.json(
            { error: 'Detailed ratings must be between 1.0 and 5.0 with half-star increments' },
            { status: 400 }
          )
        }
      }
    }

    // Check if user has already reviewed this booking
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', booking_id)
      .eq('reviewer_id', reviewer_id)
      .single()

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this booking' },
        { status: 409 }
      )
    }

    // Verify booking exists and belongs to the user
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, customer_id, status, service_date')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    if (booking.customer_id !== reviewer_id) {
      return NextResponse.json(
        { error: 'You can only review your own bookings' },
        { status: 403 }
      )
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return NextResponse.json(
        { error: 'You can only review completed bookings' },
        { status: 400 }
      )
    }

    // Create review data for moderation
    const reviewData = {
      text: comment || '',
      rating,
      reviewerId: reviewer_id,
      providerId: provider_id,
      reviewerHistory: {
        totalReviews: 0,
        avgRating: 0,
        recentReviews: 0,
        suspiciousPatterns: []
      }
    }

    // Process review with AI moderation and monitoring
    const moderationResult = await reviewMonitoring.processReviewWithMonitoring(
      reviewData,
      'temp-id' // Will be replaced with actual review ID
    )

    // Determine initial status based on moderation
    let initialStatus = 'pending'
    let moderationStatus = 'pending'
    
    if (moderationResult.isFlagged) {
      initialStatus = 'flagged'
      moderationStatus = 'needs_review'
    } else if (moderationResult.confidence > 0.9) {
      initialStatus = 'pending'
      moderationStatus = 'needs_review'
    } else {
      initialStatus = 'pending'
      moderationStatus = 'pending'
    }

    // Insert the review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        booking_id,
        reviewer_id,
        provider_id,
        rating,
        comment,
        service_quality,
        communication,
        punctuality,
        value_for_money,
        would_recommend,
        photos,
        status: initialStatus,
        moderation_status: moderationStatus,
        spam_score: moderationResult.score,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (reviewError) {
      console.error('Error creating review:', reviewError)
      return NextResponse.json(
        { error: 'Failed to create review' },
        { status: 500 }
      )
    }

    // Update the moderation log with the actual review ID
    if (moderationResult.isFlagged) {
      await reviewMonitoring.logModerationDecision(
        review.id,
        'auto_flag',
        moderationResult.reasons.join('; '),
        moderationResult.confidence,
        Object.keys(moderationResult.categories).filter(
          key => moderationResult.categories[key as keyof typeof moderationResult.categories]
        ),
        moderationResult.reasons.filter(
          reason => reason.includes('pattern:') || reason.includes('Detected')
        ),
        moderationResult.reasons.filter(
          reason => reason.includes('Excessive') || reason.includes('All') || reason.includes('Suspicious')
        ),
        0, // Processing time will be updated
        undefined,
        {
          review_id: review.id,
          original_rating: rating,
          text_length: comment?.length || 0,
          has_detailed_ratings: hasDetailedRatings
        }
      )
    }

    // Update provider rating statistics
    await updateProviderRatingStats(provider_id)

    // Track analytics
    try {
      await supabase.from('analytics_events').insert({
        event_type: 'review_submitted',
        user_id: reviewer_id,
        provider_id,
        metadata: {
          has_detailed_ratings: hasDetailedRatings,
          moderation_flagged: moderationResult.isFlagged,
          moderation_confidence: moderationResult.confidence,
          moderation_categories: Object.keys(moderationResult.categories).filter(
            key => moderationResult.categories[key as keyof typeof moderationResult.categories]
          )
        },
        created_at: new Date().toISOString()
      })
    } catch (analyticsError) {
      console.warn('Analytics tracking failed:', analyticsError)
    }

    return NextResponse.json({
      success: true,
      review: {
        id: review.id,
        status: review.status,
        moderation_status: review.moderation_status,
        spam_score: review.spam_score,
        moderation_message: moderationResult.isFlagged 
          ? `Review flagged for moderation: ${moderationResult.reasons.join(', ')}`
          : 'Review submitted successfully and pending approval'
      }
    })

  } catch (error) {
    console.error('Error in review creation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('provider_id')
    const status = searchParams.get('status') || 'published'

    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('reviews')
      .select(`
        *,
        users:reviewer_id(full_name, avatar_url),
        bookings:booking_id(service_name, service_date)
      `)
      .eq('provider_id', providerId)

    // Filter by status if specified
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: reviews, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching reviews:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reviews: reviews || [] })

  } catch (error) {
    console.error('Error in review fetching:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function updateProviderRatingStats(providerId: string) {
  try {
    // Get all published reviews for this provider
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('overall_quality, rating')
      .eq('provider_id', providerId)
      .eq('status', 'published')

    if (error || !reviews) {
      console.error('Error fetching reviews for rating update:', error)
      return
    }

    if (reviews.length === 0) {
      // No reviews, set default values
      await supabase
        .from('profiles')
        .update({
          rating: 0.0,
          updated_at: new Date().toISOString()
        })
        .eq('id', providerId)
      return
    }

    // Calculate average rating using overall_quality if available, fallback to rating
    const validRatings = reviews
      .map(r => r.overall_quality || r.rating)
      .filter(r => r !== null && r !== undefined)

    if (validRatings.length === 0) {
      console.warn('No valid ratings found for provider:', providerId)
      return
    }

    const averageRating = validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length

    // Calculate rating distribution for half-star ranges
    const ratingDistribution = {
      '5.0': 0, '4.5': 0, '4.0': 0, '3.5': 0, '3.0': 0,
      '2.5': 0, '2.0': 0, '1.5': 0, '1.0': 0
    }

    validRatings.forEach(rating => {
      const roundedRating = Math.round(rating * 2) / 2
      const key = roundedRating.toFixed(1)
      if (ratingDistribution[key as keyof typeof ratingDistribution] !== undefined) {
        ratingDistribution[key as keyof typeof ratingDistribution]++
      }
    })

    // Update provider profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        updated_at: new Date().toISOString()
      })
      .eq('id', providerId)

    if (updateError) {
      console.error('Error updating provider rating:', updateError)
    }

  } catch (error) {
    console.error('Error in updateProviderRatingStats:', error)
  }
} 