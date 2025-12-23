import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'
import { getAuthenticatedUserId } from '@/app/api/_utils/auth'

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServerSupabase()
    
    // Delete all data from main tables (be very careful!)
    const tables = ['bookings', 'reviews', 'notifications', 'support_tickets']
    
    for (const table of tables) {
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) {
        console.error(`Error deleting from ${table}:`, error)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'All data deleted successfully' 
    })
  } catch (error) {
    console.error('Delete all error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}








