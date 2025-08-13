import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔧 Testing Supabase Configuration...')
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('1️⃣ Environment variables:')
    console.log(`   SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`)
    console.log(`   SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`)
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ 
        error: 'Missing Supabase environment variables. Please check your .env.local file.',
        supabaseUrl: !!supabaseUrl,
        supabaseAnonKey: !!supabaseAnonKey
      }, { status: 500 })
    }
    
    // Test basic Supabase client creation
    console.log('2️⃣ Testing Supabase client creation...')
    const { createClient } = await import('@supabase/supabase-js')
    
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      console.log('   Supabase client created: ✅')
      
      // Test basic auth check
      console.log('3️⃣ Testing basic auth check...')
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.log(`   Auth check error: ${error.message}`)
      } else {
        console.log(`   Auth check: ${user ? '✅ User found' : '✅ No user (expected)'}`)
      }
      
      console.log('🎉 Supabase configuration test completed!')
      
      return NextResponse.json({
        success: true,
        supabaseUrl: supabaseUrl.substring(0, 20) + '…',
        supabaseAnonKey: supabaseAnonKey.substring(0, 20) + '…',
        authCheck: !error,
        currentUser: !!user,
        message: 'Supabase is configured correctly!'
      })
      
    } catch (clientError) {
      console.error('   Supabase client creation failed:', clientError)
      return NextResponse.json({ 
        error: 'Failed to create Supabase client',
        details: clientError instanceof Error ? clientError.message : 'Unknown error'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ Supabase config test failed:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
} 