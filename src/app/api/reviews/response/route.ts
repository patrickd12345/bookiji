import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { supabaseAdmin as supabase } from '@/lib/supabaseProxies';

export async function POST(request: NextRequest) {
  try {
    const { review_id, provider_id, response_text, is_public = true } = await request.json();

    if (!review_id || !provider_id || !response_text) {
      return NextResponse.json(
        { error: 'Missing required fields: review_id, provider_id, response_text' },
        { status: 400 }
      );
    }

    // Verify the review exists and belongs to the provider
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, reviewer_id, status')
      .eq('id', review_id)
      .eq('provider_id', provider_id)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found or access denied' },
        { status: 404 }
      );
    }

    if (review.status !== 'published') {
      return NextResponse.json(
        { error: 'Cannot respond to unpublished review' },
        { status: 400 }
      );
    }

    // Check if provider already responded
    const { data: existingResponse } = await supabase
      .from('review_responses')
      .select('id')
      .eq('review_id', review_id)
      .eq('provider_id', provider_id)
      .single();

    if (existingResponse) {
      return NextResponse.json(
        { error: 'Provider has already responded to this review' },
        { status: 400 }
      );
    }

    // Create the response
    const { data: response, error: responseError } = await supabase
      .from('review_responses')
      .insert({
        review_id,
        provider_id,
        response_text: response_text.trim(),
        is_public,
        status: 'published',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (responseError) {
      console.error('Response creation error:', responseError);
      return NextResponse.json(
        { error: 'Failed to create response' },
        { status: 500 }
      );
    }

    // Notify the customer
    await supabase
      .from('notifications')
      .insert({
        user_id: review.reviewer_id,
        type: 'provider_response',
        title: 'Provider Responded to Your Review',
        message: 'The provider has responded to your review',
        data: {
          review_id,
          response_id: response.id,
          provider_id
        },
        created_at: new Date().toISOString()
      });

    // Track analytics
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'provider_response_created',
        user_id: provider_id,
        session_id: 'server-side',
        page_url: '/api/reviews/response',
        properties: {
          review_id,
          is_public,
          response_length: response_text.length
        }
      })
    });

    return NextResponse.json({
      success: true,
      response,
      message: 'Response created successfully'
    });

  } catch (error) {
    console.error('Review response creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('review_id');
    const providerId = searchParams.get('provider_id');

    if (!reviewId) {
      return NextResponse.json(
        { error: 'review_id is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('review_responses')
      .select(`
        *,
        provider:provider_id(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('review_id', reviewId)
      .eq('status', 'published');

    if (providerId) {
      query = query.eq('provider_id', providerId);
    }

    const { data: responses, error } = await query;

    if (error) {
      console.error('Review responses fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch responses' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      responses: responses || []
    });

  } catch (error) {
    console.error('Review responses fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
