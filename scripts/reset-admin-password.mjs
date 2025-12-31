import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Simple .env parser (no external deps)
function loadEnv() {
  const envFiles = ['.env.local', '.env']
  for (const file of envFiles) {
    try {
      const content = readFileSync(resolve(process.cwd(), file), 'utf8')
      for (const line of content.split('\n')) {
        // Handle lines with comments at the end: KEY=value  # comment
        const cleanLine = line.split('#')[0].trim()
        if (!cleanLine) continue
        
        const match = cleanLine.match(/^([^=]+)=(.*)$/)
        if (match) {
          const key = match[1].trim()
          let value = match[2].trim()
          // Remove quotes if present
          value = value.replace(/^["']|["']$/g, '')
          // Remove trailing comments if any
          value = value.split('#')[0].trim()
          if (!process.env[key] && value) {
            process.env[key] = value
          }
        }
      }
    } catch (e) {
      // File doesn't exist, continue
    }
  }
}

loadEnv()

// Get the first valid URL (in case multiple are set)
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').split(/\s+/)[0].trim()
const supabaseServiceKey = (process.env.SUPABASE_SECRET_KEY || '').trim()

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.error(`URL: ${supabaseUrl ? '✅' : '❌'}`)
  console.error(`Service Key: ${supabaseServiceKey ? '✅ (hidden)' : '❌'}`)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function resetPassword() {
  const email = 'patrick_duchesneau_1@hotmail.com'
  const newPassword = 'Taratata!1232123'

  try {
    // List users to find the one with this email
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      process.exit(1)
    }

    let user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    
    if (!user) {
      console.log(`User with email ${email} not found. Creating new user...`)
      
      // Try to create the user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: newPassword,
        email_confirm: true,
        user_metadata: { role: 'admin' }
      })
      
      if (createError) {
        console.error(`Failed to create user: ${createError.message}`)
        console.error(`\nAvailable users (${users?.length || 0} total):`)
        users?.slice(0, 10).forEach(u => {
          console.error(`  - ${u.email} (${u.id})`)
        })
        if (users && users.length > 10) {
          console.error(`  ... and ${users.length - 10} more`)
        }
        process.exit(1)
      }
      
      user = newUser.user
      console.log(`✅ Created new user: ${user.email} (${user.id})`)
      console.log(`✅ Password set to: ${newPassword}`)
      process.exit(0)
    }

    console.log(`Found user: ${user.id} (${user.email})`)

    // Update password
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      process.exit(1)
    }

    console.log(`✅ Password reset successfully for ${email}`)
    console.log(`User ID: ${updatedUser.user.id}`)
  } catch (error) {
    console.error('Unexpected error:', error)
    process.exit(1)
  }
}

resetPassword()

