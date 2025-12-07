import { NextRequest } from 'next/server'
import { bookingService } from '@/lib/bookingService'
import type { BookingStatus } from '@/types/booking'

export async function POST(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const { id } = await context.params
  const body = await request.json()
  const result = await bookingService.updateStatus(id, body.status as BookingStatus, {
    reason: body.reason,
    adminOverride: body.adminOverride,
    adminId: body.adminId,
    skipRefund: body.skipRefund,
  })
  return Response.json(result, { status: result.success ? 200 : 400 })
}
