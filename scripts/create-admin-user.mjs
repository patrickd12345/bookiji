// @env-allow-legacy-dotenv
#!/usr/bin/env node

/**
 * Script to create an admin user
 * Usage: node scripts/create-admin-user.mjs
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SECRET_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createAdminUser() {
  const email = 'admin@bookiji.com'
  const password = 'Isatrick!123'
  const fullName = 'Admin User'

  try {
    // Try to create user directly (will fail if exists, then we'll update)
    console.log(`Creating admin user: ${email}`)
    
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { 
        role: 'admin',
        full_name: fullName
      }
    })
    
    let user
    
    if (createError) {
      // User might already exist, try to get by email
      if (createError.message?.includes('already') || createError.message?.includes('exists')) {
        console.log(`⚠️  User "${email}" may already exist. Attempting to update...`)
        
        // Try to sign in to get user ID, then update
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        })
        
        if (signInError && signInError.message?.includes('Invalid login')) {
          // User exists but password is wrong, need to find user ID another way
          // Try creating with a temporary password to get the user, then update
          console.log('   User exists with different password. Please use Supabase dashboard to reset.')
          console.log('   Or try: supabase auth admin update-user-by-email admin --password "Isatrick!123"')
          process.exit(1)
        }
        
        if (signInData?.user) {
          user = signInData.user
          console.log(`✅ Found existing user: ${user.id}`)
          
          // Update password and metadata
          const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            { 
              password: password,
              user_metadata: { role: 'admin', full_name: fullName }
            }
          )
          
          if (updateError) {
            console.error('❌ Error updating user:', updateError)
            process.exit(1)
          }
          
          user = updatedUser.user
          console.log(`✅ Updated password and metadata for ${email}`)
        } else {
          console.error(`❌ Could not find or update user: ${signInError?.message || 'Unknown error'}`)
          process.exit(1)
        }
      } else {
        console.error(`❌ Failed to create user: ${createError.message}`)
        process.exit(1)
      }
    } else {
      user = newUser.user
      console.log(`✅ Created new user: ${user.email} (${user.id})`)
    }

    // Ensure profile exists with admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Error checking profile:', profileError)
      process.exit(1)
    }

    if (profile) {
      // Update existing profile to ensure admin role
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          role: 'admin',
          full_name: fullName,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (updateProfileError) {
        console.error('❌ Error updating profile:', updateProfileError)
        process.exit(1)
      }
      
      console.log(`✅ Updated profile with admin role`)
    } else {
      // Create new profile
      const { error: insertProfileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          auth_user_id: user.id,
          email: email,
          full_name: fullName,
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertProfileError) {
        console.error('❌ Error creating profile:', insertProfileError)
        process.exit(1)
      }
      
      console.log(`✅ Created profile with admin role`)
    }

    console.log('\n✅ Admin user setup complete!')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    console.log(`   User ID: ${user.id}`)
    console.log(`\n   You can now log in at: http://localhost:3000/login`)
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

createAdminUser()

