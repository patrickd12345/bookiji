import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
  }

  const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string }
  const admin = createClient(url, secretKey, { auth: { persistSession: false } })

  try {
    // Check what tables exist
    const { data: tables, error: tablesErr } = await admin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')

    if (tablesErr) {
      return NextResponse.json({ error: `Failed to get tables: ${tablesErr.message}` }, { status: 500 })
    }

    // Check services table structure
    const { data: servicesColumns, error: servicesErr } = await admin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'services')
      .order('ordinal_position')

    if (servicesErr) {
      return NextResponse.json({ error: `Failed to get services columns: ${servicesErr.message}` }, { status: 500 })
    }

    // Check if services table has any data
    const { data: servicesData, error: servicesDataErr } = await admin
      .from('services')
      .select('*')
      .limit(1)

    if (servicesDataErr) {
      return NextResponse.json({ error: `Failed to get services data: ${servicesDataErr.message}` }, { status: 500 })
    }

    return NextResponse.json({
      tables: tables?.map(t => t.table_name) || [],
      servicesColumns: servicesColumns || [],
      servicesData: servicesData || [],
      servicesDataError: servicesDataErr ? String(servicesDataErr) : null
    })
  } catch (error) {
    console.error('Schema check error:', error)
    return NextResponse.json({ error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 })
  }
}
