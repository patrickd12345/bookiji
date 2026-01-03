/**
 * Helper to ensure E2E test users exist before login attempts
 * 
 * This provides resilience when seeding is skipped or fails.
 * Uses Supabase admin client to create users if they don't exist.
 */

import { getSupabaseAdmin } from '../e2e/helpers/supabaseAdmin'
import { E2E_CUSTOMER_USER, E2E_VENDOR_USER, E2EUserDefinition } from '../../scripts/e2e/credentials'

const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'e2e-admin@bookiji.test'
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'TestPassword123!'

/**
 * Ensures a user exists in Supabase Auth and has a profile
 * Returns true if user was created, false if already existed
 */
export async function ensureUserExists(userDef: E2EUserDefinition): Promise<{ created: boolean; userId: string }> {
  try {
    const supabase = getSupabaseAdmin()
    const { email, password, role, fullName } = userDef

    // Try to find existing user (check multiple pages in case of pagination)
    let existingUser: { id: string; email?: string } | null = null
    try {
      // Search through multiple pages (up to 5 pages = 500 users)
      for (let page = 1; page <= 5; page++) {
        const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
        if (listError) break
        existingUser = usersData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase()) || null
        if (existingUser) break
        // If we got fewer than 100 users, we've reached the end
        if (!usersData?.users || usersData.users.length < 100) break
      }
    } catch (error) {
      // If we can't list users, try to create anyway (will fail gracefully if user exists)
      console.warn(`⚠️  Could not list users to check for ${email}, attempting direct create`)
    }

    if (existingUser) {
      // User exists - ensure password is correct and profile exists
      try {
        await supabase.auth.admin.updateUserById(existingUser.id, {
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            role
          }
        })
      } catch (error) {
        // Password update may fail - continue anyway
        console.warn(`⚠️  Could not update password for ${email}, continuing with existing user`)
      }

      // Ensure profile exists
      try {
        await supabase
          .from('profiles')
          .upsert(
            {
              auth_user_id: existingUser.id,
              email,
              full_name: fullName,
              role
            },
            { onConflict: 'auth_user_id' }
          )
      } catch (error) {
        // Profile upsert may fail due to RLS - log but continue
        console.warn(`⚠️  Could not upsert profile for ${email}`)
      }

      return { created: false, userId: existingUser.id }
    }

    // User doesn't exist - create it
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role
      }
    })

    if (createError) {
      // If user already exists (race condition or concurrent creation), try to find it
      const errorMsg = createError.message?.toLowerCase() || ''
      if (errorMsg.includes('already') || 
          errorMsg.includes('exists') ||
          errorMsg.includes('registered')) {
        // Try to find the existing user (check multiple pages)
        try {
          let found: { id: string; email?: string } | null = null
          for (let page = 1; page <= 5; page++) {
            const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
            if (listError) break
            found = usersData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase()) || null
            if (found) break
            if (!usersData?.users || usersData.users.length < 100) break
          }
          if (found) {
            // User exists - ensure password and profile are correct
            try {
              await supabase.auth.admin.updateUserById(found.id, {
                password,
                email_confirm: true,
                user_metadata: {
                  full_name: fullName,
                  role
                }
              })
            } catch (updateError) {
              // Password update may fail - continue anyway
              console.warn(`⚠️  Could not update password for ${email}, continuing with existing user`)
            }

            // Ensure profile exists
            try {
              await supabase
                .from('profiles')
                .upsert(
                  {
                    auth_user_id: found.id,
                    email,
                    full_name: fullName,
                    role
                  },
                  { onConflict: 'auth_user_id' }
                )
            } catch (profileError) {
              console.warn(`⚠️  Could not upsert profile for ${email}`)
            }

            return { created: false, userId: found.id }
          }
          // User not found in list but error says it exists - might be pagination issue
          // Since we know the user exists (got "already registered"), proceed with login
          console.warn(`⚠️  User ${email} appears to exist but not found in user list. Proceeding with login attempt.`)
          // Return a dummy userId - the login will work if user exists, fail gracefully if not
          return { created: false, userId: 'unknown' }
        } catch (listError) {
          // If we can't list users, the user might still exist - try to proceed with login
          console.warn(`⚠️  Could not list users to find ${email}, user may already exist. Proceeding with login attempt.`)
          // Return a dummy userId - the login will work if user exists, fail gracefully if not
          return { created: false, userId: 'unknown' }
        }
      }
      throw new Error(`Failed to create user ${email}: ${createError.message}`)
    }

    if (!newUser?.user) {
      throw new Error(`Failed to create user ${email}: unknown error`)
    }

    const userId = newUser.user.id

    // Ensure profile exists
    try {
      await supabase
        .from('profiles')
        .upsert(
          {
            auth_user_id: userId,
            email,
            full_name: fullName,
            role
          },
          { onConflict: 'auth_user_id' }
        )
    } catch (error) {
      // Profile upsert may fail due to RLS - log but continue
      console.warn(`⚠️  Could not upsert profile for ${email}`)
    }

    // For vendors/admins, ensure app_user and user_role exist
    if (role === 'vendor' || role === 'admin') {
      try {
        const { data: appUser } = await supabase
          .from('app_users')
          .upsert(
            {
              auth_user_id: userId,
              display_name: fullName
            },
            { onConflict: 'auth_user_id' }
          )
          .select('id')
          .single()

        if (appUser?.id) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .upsert(
              {
                app_user_id: appUser.id,
                role
              },
              { onConflict: 'app_user_id,role' }
            )
          if (roleError) {
            console.warn(`⚠️  Could not upsert user_role for ${email}: ${roleError.message}`)
          }
        }
      } catch (error) {
        // app_user/user_role creation may fail - log but continue
        console.warn(`⚠️  Could not create app_user/user_role for ${email}`)
      }
    }

    return { created: true, userId }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Failed to ensure user ${userDef.email} exists: ${errorMessage}\n` +
      `\n` +
      `This usually means:\n` +
      `  1. Supabase is not running (start with: pnpm db:start)\n` +
      `  2. SUPABASE_URL or SUPABASE_SECRET_KEY is missing/incorrect\n` +
      `  3. Network cannot reach Supabase\n` +
      `\n` +
      `To fix:\n` +
      `  - Run: pnpm e2e:seed (to seed users before tests)\n` +
      `  - Or: E2E_SKIP_SEED=true pnpm e2e:all (if users already exist)\n` +
      `  - Or: Start Supabase and ensure users are seeded`
    )
  }
}

/**
 * Ensures the default E2E customer user exists
 */
export async function ensureCustomerUser(): Promise<{ created: boolean; userId: string }> {
  return ensureUserExists(E2E_CUSTOMER_USER)
}

/**
 * Ensures the default E2E vendor user exists
 */
export async function ensureVendorUser(): Promise<{ created: boolean; userId: string }> {
  return ensureUserExists(E2E_VENDOR_USER)
}

/**
 * Ensures the default E2E admin user exists
 */
export async function ensureAdminUser(): Promise<{ created: boolean; userId: string }> {
  return ensureUserExists({
    email: E2E_ADMIN_EMAIL,
    password: E2E_ADMIN_PASSWORD,
    role: 'admin',
    fullName: 'E2E Test Admin'
  })
}

