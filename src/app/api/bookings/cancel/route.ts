import { NextRequest } from 'next/server'
import { createBookingCancelHandler } from '@/lib/bookingsCancelHandler'

const handler = createBookingCancelHandler()

export async function POST(request: NextRequest) {
  return handler.handle(request)
} 