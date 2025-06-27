import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET() {
  try {
    console.log('🔍 Checking existing database tables...')
    
    // Try to query each table individually to see what exists
    const tableChecks = [
      { name: 'profiles', query: 'SELECT 1 FROM profiles LIMIT 1' },
      { name: 'users', query: 'SELECT 1 FROM users LIMIT 1' },
      { name: 'services', query: 'SELECT 1 FROM services LIMIT 1' },
      { name: 'availability_slots', query: 'SELECT 1 FROM availability_slots LIMIT 1' },
      { name: 'bookings', query: 'SELECT 1 FROM bookings LIMIT 1' },
      { name: 'reviews', query: 'SELECT 1 FROM reviews LIMIT 1' },
      { name: 'provider_locations', query: 'SELECT 1 FROM provider_locations LIMIT 1' }
    ]
    
    const results: Record<string, boolean> = {}
    
    for (const table of tableChecks) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: table.query })
        results[table.name] = !error
        console.log(`${table.name}: ${!error ? '✅' : '❌'}`)
      } catch {
        results[table.name] = false
        console.log(`${table.name}: ❌`)
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