import { NextRequest, NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createClient } from '@supabase/supabase-js';

import { supabaseAdmin as supabase } from '@/lib/supabaseProxies';

export async function POST(request: NextRequest) {
  try {
    const { reviewId, action, reason, moderatorId } = await request.json();

    if (!reviewId || !action || !moderatorId) {
      return NextResponse.json(
        { error: 'Missing required fields: reviewId, action, moderatorId' },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = ['approve', 'reject', 'remove', 'restore'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be one of: approve, reject, remove, restore' },
        { status: 400 }
      );
    }

    // Get the review
    const { data: review, error: fetchError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (fetchError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Determine update data based on action
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      moderation_status: action === 'approve' ? 'approved' : 
                         action === 'reject' ? 'rejected' : 
                         action === 'remove' ? 'removed' : 'pending',
      moderated_at: new Date().toISOString(),
      moderated_by: moderatorId
    };

    if (action === 'approve' || action === 'restore') {
      updateData.status = 'active';
      updateData.moderation_status = 'approved';
    } else if (action === 'reject' || action === 'remove') {
      updateData.status = 'hidden';
      updateData.moderation_status = action === 'reject' ? 'rejected' : 'removed';
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
