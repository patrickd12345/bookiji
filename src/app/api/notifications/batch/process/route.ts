import { NextRequest, NextResponse } from 'next/server'
import { processExpiredBatches } from '@/lib/notifications/batching'

/**
 * Background worker endpoint for processing expired notification batches
 * Should be called by a cron job or scheduled function
 * 
 * Usage:
 * - Vercel Cron: Add to vercel.json
 * - Supabase Edge Function: Create scheduled function
 * - External cron: Call this endpoint periodically
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication/authorization here
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Process all expired batches
    await processExpiredBatches()

    return NextResponse.json({ 
      success: true, 
      message: 'Batch processing completed',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error processing batches:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process batches',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Allow GET for manual triggering (remove in production or add auth)
export async function GET() {
  return POST(new NextRequest('http://localhost/api/notifications/batch/process', { method: 'POST' }))
}

