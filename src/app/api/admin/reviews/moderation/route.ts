import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const moderationStatus = searchParams.get('moderation_status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('reviews')
      .select(`
        *,
        reviewer:reviewer_id(
          id,
          full_name,
          email
        ),
        provider:provider_id(
          id,
          full_name,
          email
        ),
        booking:booking_id(
          service_name,
          service_date
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (moderationStatus) {
      query = query.eq('moderation_status', moderationStatus)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: reviews, error } = await query

    if (error) {
      console.error('Reviews fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      reviews: reviews || []
    })

  } catch (error) {
    console.error('Reviews fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      reviewId,
      action,
      reason,
      moderatorId
    } = body

    // Validate required fields
    if (!reviewId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: reviewId, action' },
        { status: 400 }
      )
    }

    // Validate action
    const validActions = ['approve', 'reject', 'flag', 'remove', 'restore']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be one of: ' + validActions.join(', ') },
        { status: 400 }
      )
    }

    // Get the review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .single()

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    switch (action) {
      case 'approve':
        updateData.status = 'published'
        updateData.moderation_status = 'approved'
        updateData.moderated_at = new Date().toISOString()
        updateData.moderated_by = moderatorId
        break
      
      case 'reject':
        updateData.status = 'removed'
        updateData.moderation_status = 'rejected'
        updateData.moderated_at = new Date().toISOString()
        updateData.moderated_by = moderatorId
        break
      
      case 'flag':
        updateData.status = 'flagged'
        updateData.moderation_status = 'needs_review'
        updateData.flagged_reason = reason
        updateData.moderated_at = new Date().toISOString()
        updateData.moderated_by = moderatorId
        break
      
      case 'remove':
        updateData.status = 'removed'
        updateData.moderation_status = 'rejected'
        updateData.moderated_at = new Date().toISOString()
        updateData.moderated_by = moderatorId
        break
      
      case 'restore':
        updateData.status = 'published'
        updateData.moderation_status = 'approved'
        updateData.moderated_at = new Date().toISOString()
        updateData.moderated_by = moderatorId
        updateData.flagged_reason = null
        break
    }

    // Update the review
    const { error: updateError } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', reviewId)

    if (updateError) {
      console.error('Review update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update review' },
        { status: 500 }
      )
    }

    // Log the moderation action
    await supabase
      .from('review_moderation_log')
      .insert({
        review_id: reviewId,
        moderator_id: moderatorId,
        action,
        reason: reason || null,
        details: {
          previous_status: review.status,
          previous_moderation_status: review.moderation_status,
          new_status: updateData.status,
          new_moderation_status: updateData.moderation_status
        },
        created_at: new Date().toISOString()
      })

    // Send notifications if needed
    if (action === 'approve' || action === 'restore') {
      // Notify customer that their review was approved
      await supabase
        .from('notifications')
        .insert({
          user_id: review.reviewer_id,
          type: 'review_approved',
          title: 'Your Review Was Approved',
          message: 'Your review has been approved and is now visible',
          data: {
            review_id: reviewId,
            provider_id: review.provider_id
          },
          created_at: new Date().toISOString()
        })
    } else if (action === 'reject' || action === 'remove') {
      // Notify customer that their review was removed
      await supabase
        .from('notifications')
        .insert({
          user_id: review.reviewer_id,
          type: 'review_rejected',
          title: 'Your Review Was Removed',
          message: reason ? `Your review was removed: ${reason}` : 'Your review was removed',
          data: {
            review_id: reviewId,
            provider_id: review.provider_id,
            reason
          },
          created_at: new Date().toISOString()
        })
    }

    // Track analytics
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'review_moderated',
        user_id: moderatorId,
        session_id: 'server-side',
        page_url: '/api/admin/reviews/moderation',
        properties: {
          review_id: reviewId,
          action,
          reason,
          provider_id: review.provider_id,
          reviewer_id: review.reviewer_id
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: `Review ${action}d successfully`
    })

  } catch (error) {
    console.error('Review moderation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

