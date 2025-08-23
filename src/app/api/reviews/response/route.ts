import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      review_id,
      provider_id,
      response_text,
      is_public = true
    } = body

    // Validate required fields
    if (!review_id || !provider_id || !response_text) {
      return NextResponse.json(
        { error: 'Missing required fields: review_id, provider_id, response_text' },
        { status: 400 }
      )
    }

    // Check if review exists and belongs to this provider
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, provider_id, status')
      .eq('id', review_id)
      .eq('provider_id', provider_id)
      .single()

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found or access denied' },
        { status: 404 }
      )
    }

    // Check if review is published
    if (review.status !== 'published') {
      return NextResponse.json(
        { error: 'Can only respond to published reviews' },
        { status: 400 }
      )
    }

    // Check if response already exists
    const { data: existingResponse } = await supabase
      .from('review_responses')
      .select('id')
      .eq('review_id', review_id)
      .eq('provider_id', provider_id)
      .single()

    if (existingResponse) {
      return NextResponse.json(
        { error: 'Response already exists for this review' },
        { status: 409 }
      )
    }

    // Create response
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
      .single()

    if (responseError) {
      console.error('Review response creation error:', responseError)
      return NextResponse.json(
        { error: 'Failed to create response' },
        { status: 500 }
      )
    }

    // Send notification to customer about provider response
    const { data: reviewWithCustomer } = await supabase
      .from('reviews')
      .select('reviewer_id')
      .eq('id', review_id)
      .single()

    if (reviewWithCustomer) {
      await supabase
        .from('notifications')
        .insert({
          user_id: reviewWithCustomer.reviewer_id,
          type: 'provider_response',
          title: 'Provider Responded to Your Review',
          message: 'The provider has responded to your review',
          data: {
            review_id,
            response_id: response.id,
            provider_id
          },
          created_at: new Date().toISOString()
        })
    }

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
    })

    return NextResponse.json({
      success: true,
      response,
      message: 'Response created successfully'
    })

  } catch (error) {
    console.error('Review response creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reviewId = searchParams.get('review_id')
    const providerId = searchParams.get('provider_id')

    if (!reviewId) {
      return NextResponse.json(
        { error: 'review_id is required' },
        { status: 400 }
      )
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
      .eq('status', 'published')

    if (providerId) {
      query = query.eq('provider_id', providerId)
    }

    const { data: responses, error } = await query

    if (error) {
      console.error('Review responses fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch responses' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      responses: responses || []
    })

  } catch (error) {
    console.error('Review responses fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

