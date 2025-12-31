#!/usr/bin/env node
/**
 * Authentication Helper for Staging Chaos Sessions
 * 
 * Creates authenticated sessions using Supabase for staging chaos testing.
 */

/**
 * Get Supabase credentials from environment
 */
function getSupabaseConfig() {
  // Try to read from .env.local
  const envLocalPath = path.join(process.cwd(), '.env.local')
  let supabaseUrl = null
  let supabaseAnonKey = null
  let supabaseServiceKey = null

  try {
    if (fs.existsSync(envLocalPath)) {
      const envContent = fs.readFileSync(envLocalPath, 'utf8')
      
      const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*([^\s\r\n]+)/i)
      if (urlMatch) {
        supabaseUrl = urlMatch[1].trim().replace(/^["']|["']$/g, '')
      }
      
      const publishableMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\s*=\s*([^\s\r\n]+)/i)
      if (publishableMatch) {
        supabaseAnonKey = publishableMatch[1].trim().replace(/^["']|["']$/g, '')
      }
      
      const serviceMatch = envContent.match(/SUPABASE_SECRET_KEY\s*=\s*([^\s\r\n]+)/i)
      if (serviceMatch) {
        supabaseServiceKey = serviceMatch[1].trim().replace(/^["']|["']$/g, '')
      }
    }
  } catch (e) {
    // Ignore
  }

  // Fallback to environment variables
  supabaseUrl = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL
  supabaseAnonKey = supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  supabaseServiceKey = supabaseServiceKey || process.env.SUPABASE_SECRET_KEY

  return { supabaseUrl, supabaseAnonKey, supabaseServiceKey }
}

/**
 * Create or get a test user and return session token
 */
export async function authenticateForStaging(baseUrl) {
  const { supabaseUrl, supabaseAnonKey, supabaseServiceKey } = getSupabaseConfig()

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('   ⚠️  Supabase credentials not found')
    return null
  }

  try {
    // Use Supabase JS client to create a test user and get session
    const { createClient } = await import('@supabase/supabase-js')
    
    // Use service role for admin operations
    const adminClient = supabaseServiceKey 
      ? createClient(supabaseUrl, supabaseServiceKey)
      : null

    // Create test user if needed
    const testEmail = `chaos-test-${Date.now()}@bookiji.staging`
    const testPassword = `ChaosTest${Date.now()}!`

    let userId = null

    if (adminClient) {
      // Try to create user via admin
      try {
        const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
          email: testEmail,
          password: testPassword,
          email_confirm: true
        })

        if (userData?.user) {
          userId = userData.user.id
        } else if (createError) {
          // User might already exist, try to sign in
          console.log('   User may already exist, attempting sign in...')
        }
      } catch (e) {
        // Ignore
      }
    }

    // Now sign in with the test user to get session
    const anonClient = createClient(supabaseUrl, supabaseAnonKey)
    
    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })

    if (signInError && signInError.message.includes('Invalid login')) {
      // User doesn't exist, try creating via admin first
      if (adminClient) {
        const { data: newUser } = await adminClient.auth.admin.createUser({
          email: testEmail,
          password: testPassword,
          email_confirm: true
        })
        
        if (newUser?.user) {
          // Retry sign in
          const { data: retrySignIn } = await anonClient.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
          })
          
          if (retrySignIn?.session?.access_token) {
            return {
              token: retrySignIn.session.access_token,
              userId: retrySignIn.user.id,
              email: testEmail
            }
          }
        }
      }
    } else if (signInData?.session?.access_token) {
      return {
        token: signInData.session.access_token,
        userId: signInData.user.id,
        email: testEmail
      }
    }

    return null
  } catch (error) {
    console.log('   ⚠️  Authentication error:', error.message)
    return null
  }
}






















