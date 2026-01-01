/**
 * Partner API v1: Get Vendor Availability
 * 
 * GET /v1/vendors/{vendorId}/availability
 * 
 * Returns computed availability for a vendor over a time range.
 */

import { NextRequest, NextResponse } from 'next/server'
import type {
  GetAvailabilityRequest,
  GetAvailabilityResponse,
  ApiError,
} from '@/types/core-infrastructure'
import { authenticatePartner } from '@/lib/core-infrastructure/partnerAuth'
import { computeAvailability } from '@/lib/core-infrastructure/availabilityEngine'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
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
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const startTime = searchParams.get('startTime')
    const endTime = searchParams.get('endTime')
    const slotDuration = searchParams.get('slotDuration')
    const includeConfidence = searchParams.get('includeConfidence') === 'true'
    
    // Validate required parameters
    if (!startTime || !endTime) {
      return NextResponse.json<ApiError>(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required parameters: startTime, endTime',
            details: {
              required: ['startTime', 'endTime'],
            },
            retryable: false,
          },
        },
        { status: 400 }
      )
    }
    
    // Validate date format
    const startDate = new Date(startTime)
    const endDate = new Date(endTime)
    
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
            message: 'startTime must be before endTime',
            retryable: false,
          },
        },
        { status: 400 }
      )
    }
    
    const { vendorId } = await params
    
    // Compute availability
    const availabilityResult = await computeAvailability({
      vendorId,
      startTime: startTime,
      endTime: endTime,
      slotDuration: slotDuration ? parseInt(slotDuration, 10) : undefined,
      includeConfidence,
      partnerId,
    })
    
    if (!availabilityResult.success || !availabilityResult.data) {
      if (availabilityResult.error === 'VENDOR_NOT_FOUND') {
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
      
      // Internal error (retryable)
      return NextResponse.json<ApiError>(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to compute availability',
            retryable: true,
            retryAfter: 5, // seconds
          },
        },
        { status: 500 }
      )
    }
    
    const response: GetAvailabilityResponse = {
      vendorId,
      startTime,
      endTime,
      computedAt: availabilityResult.data.computedAt,
      computedVersion: availabilityResult.data.computedVersion,
      slots: availabilityResult.data.slots,
      metadata: {
        confidenceThreshold: availabilityResult.data.metadata.confidenceThreshold,
        computationTimeMs: availabilityResult.data.metadata.computationTimeMs,
      },
    }
    
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Error in GET /v1/vendors/[vendorId]/availability:', error)
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
