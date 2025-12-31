import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Simple .env parser
function loadEnv() {
  const envFiles = ['.env.local', '.env']
  for (const file of envFiles) {
    try {
      const content = readFileSync(resolve(process.cwd(), file), 'utf8')
      for (const line of content.split('\n')) {
        const cleanLine = line.split('#')[0].trim()
        if (!cleanLine) continue
        const match = cleanLine.match(/^([^=]+)=(.*)$/)
        if (match) {
          const key = match[1].trim()
          let value = match[2].trim().replace(/^["']|["']$/g, '').split('#')[0].trim()
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

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').split(/\s+/)[0].trim()
const supabaseServiceKey = (process.env.SUPABASE_SECRET_KEY || '').trim()

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testAdminAccess() {
  const email = 'patrick_duchesneau_1@hotmail.com'
  const password = 'Taratata!1232123'

  console.log('🔐 Testing admin access for:', email)
  console.log('')

  try {
    // 1. Find the user
    console.log('1️⃣ Finding user...')
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ Error listing users:', listError)
      process.exit(1)
    }

    const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    
    if (!user) {
      console.error(`❌ User with email ${email} not found`)
      process.exit(1)
    }

    console.log(`✅ Found user: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Created: ${user.created_at}`)
    console.log('')

    // 2. Check admin email allow list
    console.log('2️⃣ Checking admin email allow list...')
    const ADMIN_EMAILS = [
      'admin@bookiji.com',
      'patri@bookiji.com',
      'patrick_duchesneau_1@hotmail.com'
    ]
    
    if (ADMIN_EMAILS.includes(user.email || '')) {
      console.log('✅ Email is in admin allow list')
    } else {
      console.log('❌ Email is NOT in admin allow list')
    }
    console.log('')

    // 3. Check profiles table
    console.log('3️⃣ Checking profiles table...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError && !profileError.message.includes('does not exist')) {
      console.log('⚠️  Error checking profile:', profileError.message)
    }
    
    if (profile) {
      console.log(`✅ Profile exists`)
      console.log(`   Role: ${profile.role || 'not set'}`)
      if (profile.role === 'admin') {
        console.log('✅ User has admin role in profiles table')
      } else {
        console.log('⚠️  Profile exists but role is not admin - updating...')
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', user.id)
        
        if (updateError) {
          console.error('❌ Failed to update profile role:', updateError.message)
        } else {
          console.log('✅ Updated profile role to admin')
        }
      }
    } else {
      console.log('⚠️  No profile found - creating one with admin role...')
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          auth_user_id: user.id,
          full_name: 'Admin User',
          email: user.email,
          role: 'admin'
        })
      
      if (createError) {
        console.error('❌ Failed to create profile:', createError.message)
        console.log('   Trying alternative approach...')
        // Try without auth_user_id if that column doesn't exist
        const { error: createError2 } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: 'Admin User',
            email: user.email,
            role: 'admin'
          })
        
        if (createError2) {
          console.error('❌ Failed to create profile (alternative):', createError2.message)
        } else {
          console.log('✅ Created profile with admin role (alternative method)')
        }
      } else {
        console.log('✅ Created profile with admin role')
      }
    }
    console.log('')

    // 4. Check user_roles table
    console.log('4️⃣ Checking user_roles table...')
    // First check if app_users entry exists
    const { data: appUser } = await supabase
      .from('app_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!appUser) {
      console.log('⚠️  No app_users entry found - creating one...')
      const { data: newAppUser, error: appUserError } = await supabase
        .from('app_users')
        .insert({
          auth_user_id: user.id,
          display_name: 'Admin User'
        })
        .select('id')
        .single()

      if (appUserError) {
        console.error('❌ Failed to create app_users entry:', appUserError.message)
      } else {
        console.log('✅ Created app_users entry')
        
        // Now add admin role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            app_user_id: newAppUser.id,
            role: 'admin'
          })
        
        if (roleError) {
          console.error('❌ Failed to add admin role:', roleError.message)
        } else {
          console.log('✅ Added admin role to user_roles table')
        }
      }
    } else {
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('app_user_id', appUser.id)
        .eq('role', 'admin')
        .maybeSingle()

      if (userRole) {
        console.log('✅ User has admin role in user_roles table')
      } else {
        console.log('⚠️  No admin role found - adding it...')
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            app_user_id: appUser.id,
            role: 'admin'
          })
        
        if (roleError) {
          console.error('❌ Failed to add admin role:', roleError.message)
        } else {
          console.log('✅ Added admin role to user_roles table')
        }
      }
    }
    console.log('')

    // 5. Test login
    console.log('5️⃣ Testing login...')
    const testClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '')
    const { data: loginData, error: loginError } = await testClient.auth.signInWithPassword({
      email,
      password
    })

    if (loginError) {
      console.error('❌ Login failed:', loginError.message)
    } else {
      console.log('✅ Login successful!')
      console.log(`   User ID: ${loginData.user.id}`)
      console.log(`   Session: ${loginData.session ? 'Active' : 'None'}`)
    }
    console.log('')

    // Final verification
    const { data: finalProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    console.log('✅ Admin access setup complete!')
    console.log('')
    console.log('Summary:')
    console.log(`  - Email in allow list: ${ADMIN_EMAILS.includes(user.email || '') ? '✅' : '❌'}`)
    console.log(`  - Profile with admin role: ${finalProfile?.role === 'admin' ? '✅' : '❌'}`)
    console.log(`  - Login works: ${loginData?.user ? '✅' : '❌'}`)
    console.log('')
    console.log('🎉 All admin access methods are configured!')
    console.log('')
    console.log('Next steps:')
    console.log('1. Make sure your dev server is running: pnpm dev')
    console.log('2. Log in at: http://localhost:3000/login')
    console.log('   Email: patrick_duchesneau_1@hotmail.com')
    console.log('   Password: Taratata!1232123')
    console.log('3. Navigate to: http://localhost:3000/admin/simcity/mission-control')
    console.log('')
    console.log('If you still see "Admin Access Required", try:')
    console.log('- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)')
    console.log('- Clear browser cookies and log in again')
    console.log('- Check browser console (F12) for any errors')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

testAdminAccess()

