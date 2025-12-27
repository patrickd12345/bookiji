import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { assertDestructiveOpAllowed } from '@/lib/env/operationalInvariants'

/**
 * AUTHORITATIVE PATH — Admin Settings Delete All
 * See: docs/invariants/admin-ops.md INV-1
 * 
 * WARNING: This is a destructive operation and is forbidden in production.
 */
export async function POST(request: NextRequest) {
  try {
    // Enforce environment isolation: destructive ops forbidden in prod
    assertDestructiveOpAllowed('deleteAll', true)

    const supabase = createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await requireAdmin(session)
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const dbSupabase = getServerSupabase()
    
    // Delete all data from main tables (be very careful!)
    const tables = ['bookings', 'reviews', 'notifications', 'support_tickets']
    
    for (const table of tables) {
      const { error } = await dbSupabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
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











