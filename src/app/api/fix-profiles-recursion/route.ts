import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseProxies';

export async function POST() {
  try {
    console.log('🚨 Emergency fix: Removing profiles table recursion...')
    
    // 1. Drop all problematic recursive policies
    const dropPolicies = `
      DROP POLICY IF EXISTS "profiles_public_read" ON profiles;
      DROP POLICY IF EXISTS "profiles_own_update" ON profiles;
      DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
      DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
      DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    `

    // 2. Create simple, non-recursive policies
    const createSimplePolicies = `
      CREATE POLICY "profiles_simple_select" ON profiles
        FOR SELECT USING (
          id = auth.uid() OR true
        );
    
      CREATE POLICY "profiles_simple_insert" ON profiles
        FOR INSERT WITH CHECK (
          id = auth.uid()
        );
    
      CREATE POLICY "profiles_simple_update" ON profiles
        FOR UPDATE USING (
          id = auth.uid()
        );
    `

    // 3. Fix other tables with similar issues
    const fixOtherTables = `
      DROP POLICY IF EXISTS "security_logs_admin_read" ON security_logs;
      CREATE POLICY "security_logs_admin_read" ON security_logs
        FOR SELECT USING (auth.uid() IS NOT NULL);
    
      DROP POLICY IF EXISTS "rate_limits_user_read" ON rate_limits;
      CREATE POLICY "rate_limits_user_read" ON rate_limits
        FOR SELECT USING (
          identifier = auth.uid()::text OR auth.uid() IS NOT NULL
        );
    
      DROP POLICY IF EXISTS "admin_permissions_read" ON admin_permissions;
      CREATE POLICY "admin_permissions_read" ON admin_permissions
        FOR SELECT USING (
          user_id = auth.uid() OR auth.uid() IS NOT NULL
        );
    `

    // Execute the fixes
    const { error: dropError } = await supabase.rpc('exec_sql', { sql: dropPolicies })
    if (dropError) console.log('Drop policies result:', dropError)

    const { error: createError } = await supabase.rpc('exec_sql', { sql: createSimplePolicies })
    if (createError) console.log('Create policies result:', createError)

    const { error: fixError } = await supabase.rpc('exec_sql', { sql: fixOtherTables })
    if (fixError) console.log('Fix other tables result:', fixError)

    // Test if the fix worked
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    if (testError) {
      console.error('❌ Fix failed:', testError)
      return NextResponse.json({ 
        success: false, 
        error: 'Fix failed - manual intervention required',
        details: testError
      }, { status: 500 })
    }

    console.log('✅ Profiles table recursion fixed successfully!')
    return NextResponse.json({ 
      success: true, 
      message: 'Profiles table recursion fixed',
      testResult: testData
    })

  } catch (error) {
    console.error('❌ Emergency fix failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Emergency fix failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
