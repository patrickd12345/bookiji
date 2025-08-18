import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

export async function GET() {
  try {
    console.log('🔧 Testing Supabase Configuration...')
    
    const config = getSupabaseConfig()
    const supabase = createClient(config.url, config.publishableKey || config.anonKey)
    
    console.log('1️⃣ Supabase configuration:')
    console.log(`   URL: ${config.url ? '✅ Set' : '❌ Missing'}`)
    console.log(`   Publishable Key: ${config.publishableKey ? '✅ Set' : '❌ Missing'}`)
    
    if (!config.url || !config.publishableKey) {
      return NextResponse.json({ 
        error: 'Missing Supabase configuration. Please check your .env.local file.',
        url: !!config.url,
        publishableKey: !!config.publishableKey
      }, { status: 500 })
    }
    
    // Test basic Supabase client creation
    console.log('2️⃣ Testing Supabase client creation...')
    
    try {
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
        supabaseUrl: config.url.substring(0, 20) + '…',
        publishableKey: config.publishableKey.substring(0, 20) + '…',
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