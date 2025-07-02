import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET() {
  try {
    console.log('🔍 Checking existing database tables...')
    
    // Try to query each table individually to see what exists
    const tableChecks = [
      'profiles',
      'users',
      'services',
      'availability_slots',
      'bookings',
      'reviews',
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
        console.log(`${tableName}: ${!error ? '✅' : '❌'} ${error?.message || ''}`)
      } catch (err) {
        results[tableName] = false
        console.log(`${tableName}: ❌ ${err}`)
      }
    }
    
    const existingTables = Object.keys(results).filter(table => results[table])
    const missingTables = Object.keys(results).filter(table => !results[table])
    
    console.log('✅ Existing tables:', existingTables)
    console.log('❌ Missing tables:', missingTables)

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