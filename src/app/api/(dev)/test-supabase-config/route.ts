import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

function redact(value: string, keepStart: number = 12): string {
  if (!value) return 'missing'
  if (value.length <= keepStart) return `${value}…`
  return `${value.slice(0, keepStart)}…`
}

function classifyKey(key: string | undefined) {
  if (!key) return 'missing'
  if (key.startsWith('eyJ')) return 'jwt'
  if (key.startsWith('sb_publishable_')) return 'sb_publishable'
  if (key.startsWith('sb_secret__')) return 'sb_secret_cli'
  return 'unknown'
}

export async function GET() {
  try {
    console.log('🔧 Testing Supabase Configuration...')
    
    let config
    try {
      config = getSupabaseConfig()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      return NextResponse.json(
        {
          success: false,
          error: message,
          requiredEnv: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],
        },
        { status: 500 }
      )
    }

    const supabase = createClient(config.url, config.publishableKey)
    
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
        supabaseUrl: redact(config.url, 24),
        keyKind: classifyKey(config.publishableKey),
        publishableKeyPreview: redact(config.publishableKey, 12),
        authCheck: !error,
        authError: error?.message ?? null,
        currentUser: !!user,
        message:
          !error
            ? 'Supabase is configured correctly!'
            : 'Supabase client created, but auth check failed (often due to invalid/mismatched API key).'
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