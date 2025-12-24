import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'
import { getAuthenticatedUserId } from '@/app/api/_utils/auth'

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, vendorIds } = await request.json()

    if (!action || !vendorIds || !Array.isArray(vendorIds) || vendorIds.length === 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabase = getServerSupabase()
    
    // Update vendor statuses based on action
     
    let _status: string
    switch (action) {
      case 'approve':
        _status = 'active'
        break
      case 'reject':
         
        _status = 'suspended'
        break
      case 'suspend':
        _status = 'suspended'
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { error } = await supabase
      .from('profiles')
      .update({ 
        role: 'vendor',
        updated_at: new Date().toISOString()
      })
      .in('id', vendorIds)
      .eq('role', 'vendor')

    if (error) {
      console.error('Bulk update error:', error)
      return NextResponse.json({ error: 'Failed to update vendors' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully ${action}d ${vendorIds.length} vendor(s)` 
    })
  } catch (error) {
    console.error('Bulk action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}









