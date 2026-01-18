import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseProxies'

export async function GET(request: NextRequest) {
  // 🛡️ Security: Require CRON_SECRET (Fail Safe)
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.warn('🔍 Checking existing database tables...')
    
    // Try to query each table individually to see what exists
    const tableChecks = [
      'profiles',
      'users',
      'services',
      'availability_slots',
      'bookings',
      'provider_locations'
    ]
    
    const results: Record<string, boolean> = {}
    
    for (const tableName of tableChecks) {
      try {
        // Use from() to check if table exists and is accessible
        const { error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)
        
        results[tableName] = !error
        console.warn(`${tableName}: ${!error ? '✅' : '❌'} ${error?.message || ''}`)
      } catch (err) {
        results[tableName] = false
        console.warn(`${tableName}: ❌ ${err}`)
      }
    }
    
    const existingTables = Object.keys(results).filter(table => results[table])
    const missingTables = Object.keys(results).filter(table => !results[table])
    
    console.warn('✅ Existing tables:', existingTables)
    console.warn('❌ Missing tables:', missingTables)

    return NextResponse.json({
      success: true,
      tableStatus: results,
      existingTables,
      missingTables,
      message: `Found ${existingTables.length} existing tables, ${missingTables.length} missing tables`
    })
    
  } catch (error) {
    console.error('❌ Table check failed:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
} 