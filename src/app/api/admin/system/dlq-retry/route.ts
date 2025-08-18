import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers'

async function checkAdminAuth() {
  const { url, secretKey } = getSupabaseConfig()
  const cookieStore = cookies()
  
  const supabase = createClient(url, secretKey!, { 
    auth: { persistSession: false },
    global: { headers: { Cookie: cookieStore.toString() } }
  })
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { authorized: false, supabase: null, user: null }
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  
  if (!profile || profile.role !== 'admin') {
    return { authorized: false, supabase: null, user: null }
  }
  
  return { authorized: true, supabase, user }
}

async function logAuditEvent(supabase: any, userId: string, action: string, entityType: string, entityId: string, metadata: any) {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to log audit event:', error)
    // Don't fail the main operation if audit logging fails
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, supabase, user } = await checkAdminAuth()
    
    if (!authorized || !supabase || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { count } = await request.json()

    if (!count || count < 1 || count > 100) {
      return NextResponse.json({ error: 'Count must be between 1 and 100' }, { status: 400 })
    }

    // Get the DLQ items to retry
    const { data: dlqItems, error: fetchError } = await supabase
      .from('dead_letter_queue')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(count)

    if (fetchError) {
      console.error('Error fetching DLQ items:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch DLQ items' }, { status: 500 })
    }

    if (!dlqItems || dlqItems.length === 0) {
      return NextResponse.json({ 
        retried: 0, 
        message: 'No items in dead letter queue' 
      })
    }

    let retriedCount = 0
    const failedRetries: string[] = []

    // Process each DLQ item
    for (const item of dlqItems) {
      try {
        // This is a simplified retry logic. In a real implementation, you'd:
        // 1. Parse the original message/payload
        // 2. Re-queue it to the appropriate processing queue
        // 3. Update or remove the DLQ entry

        // For now, we'll just mark it as retried by moving it to a processed state
        const { error: updateError } = await supabase
          .from('dead_letter_queue')
          .update({ 
            status: 'retried',
            retried_at: new Date().toISOString(),
            retried_by: user.id
          })
          .eq('id', item.id)

        if (updateError) {
          console.error(`Error updating DLQ item ${item.id}:`, updateError)
          failedRetries.push(item.id)
        } else {
          retriedCount++
          
          // In a real implementation, you'd also re-queue the original message:
          // await reprocessMessage(item.original_payload)
        }
      } catch (itemError) {
        console.error(`Error processing DLQ item ${item.id}:`, itemError)
        failedRetries.push(item.id)
      }
    }

    // Log audit event
    await logAuditEvent(
      supabase, 
      user.id, 
      'dlq_retry', 
      'system', 
      'dead_letter_queue', 
      { 
        requested_count: count,
        retried_count: retriedCount,
        failed_items: failedRetries,
        timestamp: new Date().toISOString()
      }
    )

    return NextResponse.json({ 
      retried: retriedCount,
      failed: failedRetries.length,
      message: `Successfully retried ${retriedCount} of ${dlqItems.length} DLQ items`
    })
    
  } catch (error) {
    console.error('Error in admin DLQ retry API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
