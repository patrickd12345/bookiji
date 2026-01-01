/**
 * Partner API v1: Get Reservation
 * 
 * GET /v1/reservations/{reservationId}
 * 
 * Returns the current state of a reservation.
 */

import { NextRequest, NextResponse } from 'next/server'
import type {
  GetReservationResponse,
  ApiError,
} from '@/types/core-infrastructure'
import { authenticatePartner } from '@/lib/core-infrastructure/partnerAuth'
import { getReservation } from '@/lib/core-infrastructure/reservationService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reservationId: string }> }
) {
  try {
    // Authenticate partner
    const authResult = await authenticatePartner(request)
    if (!authResult.success || !authResult.data) {
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
    const { reservationId } = await params
    
    // Get reservation
    const reservationResult = await getReservation(reservationId, partnerId)
    
    if (!reservationResult.success || !reservationResult.data) {
      if (reservationResult.error === 'RESERVATION_NOT_FOUND') {
        return NextResponse.json<ApiError>(
          {
            error: {
              code: 'NOT_FOUND',
              message: 'Reservation not found',
              retryable: false,
            },
          },
          { status: 404 }
        )
      }
      
      if (reservationResult.error === 'UNAUTHORIZED') {
        return NextResponse.json<ApiError>(
          {
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied to this reservation',
              retryable: false,
            },
          },
          { status: 403 }
        )
      }
      
      // Internal error (retryable)
      return NextResponse.json<ApiError>(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve reservation',
            retryable: true,
            retryAfter: 5,
          },
        },
        { status: 500 }
      )
    }
    
    const reservation = reservationResult.data
    
    const response: GetReservationResponse = {
      reservationId: reservation.id,
      state: reservation.state,
      vendorId: reservation.vendorId,
      slotStartTime: reservation.slotStartTime,
      slotEndTime: reservation.slotEndTime,
      requesterId: reservation.requesterId,
      createdAt: reservation.createdAt,
      expiresAt: reservation.expiresAt,
      stateHistory: [], // TODO: Fetch state history from database
      paymentState: reservation.paymentState,
      bookingId: reservation.bookingId,
      failureReason: reservation.failureReason,
    }
    
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Error in GET /v1/reservations/[reservationId]:', error)
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
