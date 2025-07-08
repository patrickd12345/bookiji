import { NextRequest } from 'next/server'
import { createBookingsUserHandler } from '@/lib/bookingsUserHandler'

const handler = createBookingsUserHandler()

export async function GET(request: NextRequest) {
  return handler.handle(request)
} 