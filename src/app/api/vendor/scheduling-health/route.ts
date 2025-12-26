import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const searchParams = request.nextUrl.searchParams
    const vendorId = searchParams.get('vendor_id')

    if (!vendorId) {
      return NextResponse.json({ error: 'vendor_id required' }, { status: 400 })
    }

    // TODO: Query vendor_certifications table for last certification
    // For now, return default status
    // This should be replaced with actual database query
    
    // Example query (when table exists):
    // const { data: lastCert } = await supabase
    //   .from('vendor_certifications')
    //   .select('*')
    //   .eq('vendor_id', vendorId)
    //   .order('created_at', { ascending: false })
    //   .limit(1)
    //   .single()

    // For now, return unknown status
    return NextResponse.json({
      status: 'unknown',
      last_certification: null
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      { error: 'Failed to check health status' },
      { status: 500 }
    )
  }
}

