/**
 * Vendor Availability API
 * 
 * Endpoint: POST /api/vendor/availability
 * 
 * Creates availability slots for vendors with conflict detection.
 * Part of F-009: Slot conflict detection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';
import { AtomicSlotOperations } from '@/lib/availability/atomicSlotOperations';
import type { CreateSlotRequest } from '@/lib/availability/types';

interface CreateAvailabilityRequest {
  service_id: string;
  start_time: string; // ISO 8601
  end_time: string;   // ISO 8601
  recurrence_rule?: Record<string, unknown>;
}

interface ConflictResponse {
  slot_id: string;
  start_time: string;
  end_time: string;
  conflict_type: string;
  overlap_start: string;
  overlap_end: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getServerSupabase();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body: CreateAvailabilityRequest = await req.json();

    // Validate required fields
    if (!body.service_id || !body.start_time || !body.end_time) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Missing required fields: service_id, start_time, end_time',
        },
        { status: 400 }
      );
    }

    // Parse dates
    const startTime = new Date(body.start_time);
    const endTime = new Date(body.end_time);

    // Validate dates
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid date format. Use ISO 8601 format.',
        },
        { status: 400 }
      );
    }

    // Verify user is a vendor and owns the service
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('provider_id')
      .eq('id', body.service_id)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        {
          success: false,
          error: 'SERVICE_NOT_FOUND',
          message: 'Service not found',
        },
        { status: 404 }
      );
    }

    if (service.provider_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'You do not own this service',
        },
        { status: 403 }
      );
    }

    // Create slot atomically with conflict detection
    const createRequest: CreateSlotRequest = {
      providerId: user.id,
      serviceId: body.service_id,
      startTime,
      endTime,
      recurrenceRule: body.recurrence_rule,
    };

    const result = await AtomicSlotOperations.createSlotAtomically(createRequest);

    if (!result.success) {
      // Format conflicts for response
      const conflicts: ConflictResponse[] = (result.conflicts || []).map(
        (conflict) => ({
          slot_id: conflict.existingSlotId,
          start_time: conflict.existingSlot.startTime.toISOString(),
          end_time: conflict.existingSlot.endTime.toISOString(),
          conflict_type: conflict.conflictType,
          overlap_start: conflict.overlapStart.toISOString(),
          overlap_end: conflict.overlapEnd.toISOString(),
        })
      );

      return NextResponse.json(
        {
          success: false,
          error: result.errorCode || 'CONFLICT_DETECTED',
          message: result.error || 'Slot conflicts with existing availability',
          conflicts,
          resolution_options: ['keep_existing', 'replace', 'adjust', 'merge'],
        },
        { status: 409 }
      );
    }

    // Success - return created slot
    const { data: slot, error: slotError } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('id', result.slotId)
      .single();

    if (slotError || !slot) {
      // Slot was created but we can't fetch it - still return success
      return NextResponse.json(
        {
          success: true,
          slot_id: result.slotId,
          message: 'Slot created successfully',
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        slot_id: result.slotId,
        slot,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/vendor/availability:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
