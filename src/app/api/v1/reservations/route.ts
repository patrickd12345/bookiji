/**
 * Partner API v1: Create Reservation
 * 
 * POST /v1/reservations
 * 
 * Creates a reservation (soft hold) for a slot.
 */

import { NextRequest, NextResponse } from 'next/server'
import type {
  CreateReservationRequest,
  CreateReservationResponse,
  ApiError,
} from '@/types/core-infrastructure'
import { authenticatePartner } from '@/lib/core-infrastructure/partnerAuth'
import { createReservation } from '@/lib/core-infrastructure/reservationService'

export async function POST(request: NextRequest) {
  try {
    // Authenticate partner
    const authResult = await authenticatePartner(request)
    if (!authResult.success) {
      return NextResponse.json<ApiError>(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or missing API key',
            retryable: false,
          },
        },
        { status: 401 }
      )
    }
    
    const { partnerId } = authResult.data
    
    // Parse request body
    let body: CreateReservationRequest
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json<ApiError>(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid JSON in request body',
            retryable: false,
          },
        },
        { status: 400 }
      )
    }
    
    // Validate required fields
    if (!body.vendorId || !body.slotStartTime || !body.slotEndTime || !body.requesterId) {
      return NextResponse.json<ApiError>(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields: vendorId, slotStartTime, slotEndTime, requesterId',
            details: {
              required: ['vendorId', 'slotStartTime', 'slotEndTime', 'requesterId'],
            },
            retryable: false,
          },
        },
        { status: 400 }
      )
    }
    
    // Validate date format
    const startDate = new Date(body.slotStartTime)
    const endDate = new Date(body.slotEndTime)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json<ApiError>(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid date format. Use ISO 8601 format.',
            retryable: false,
          },
        },
        { status: 400 }
      )
    }
    
    if (startDate >= endDate) {
      return NextResponse.json<ApiError>(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'slotStartTime must be before slotEndTime',
            retryable: false,
          },
        },
        { status: 400 }
      )
    }
    
    // Check if slot is in the future
    if (startDate < new Date()) {
      return NextResponse.json<ApiError>(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'slotStartTime must be in the future',
            retryable: false,
          },
        },
        { status: 400 }
      )
    }
    
    // Create reservation
    const reservationResult = await createReservation({
      partnerId,
      vendorId: body.vendorId,
      requesterId: body.requesterId,
      slotStartTime: body.slotStartTime,
      slotEndTime: body.slotEndTime,
      metadata: body.metadata,
      idempotencyKey: body.idempotencyKey,
    })
    
    if (!reservationResult.success) {
      if (reservationResult.error === 'SLOT_ALREADY_RESERVED') {
        return NextResponse.json<ApiError>(
          {
            error: {
              code: 'CONFLICT',
              message: 'Slot is already reserved',
              retryable: false,
            },
          },
          { status: 409 }
        )
      }
      
      if (reservationResult.error === 'VENDOR_NOT_FOUND') {
        return NextResponse.json<ApiError>(
          {
            error: {
              code: 'NOT_FOUND',
              message: 'Vendor not found',
              retryable: false,
            },
          },
          { status: 404 }
        )
      }
      
      if (reservationResult.error === 'RATE_LIMIT_EXCEEDED') {
        return NextResponse.json<ApiError>(
          {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Rate limit exceeded',
              retryable: true,
              retryAfter: 60, // seconds
            },
          },
          { status: 429 }
        )
      }
      
      // Internal error (retryable)
      return NextResponse.json<ApiError>(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create reservation',
            retryable: true,
            retryAfter: 5,
          },
        },
        { status: 500 }
      )
    }
    
    const reservation = reservationResult.data
    
    // Calculate estimated confirmation time (vendor has 10 minutes)
    const estimatedConfirmationTime = new Date(
      new Date(reservation.createdAt).getTime() + 10 * 60 * 1000
    ).toISOString()
    
    const response: CreateReservationResponse = {
      reservationId: reservation.id,
      state: reservation.state,
      expiresAt: reservation.expiresAt,
      vendorConfirmationRequired: true,
      estimatedConfirmationTime,
    }
    
    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error in POST /v1/reservations:', error)
    return NextResponse.json<ApiError>(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          retryable: true,
          retryAfter: 5,
        },
      },
      { status: 500 }
    )
  }
}
