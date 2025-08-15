import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    console.log('🔍 Checking database migration status...')
    
    // Check if profiles table exists and has beta_status column
    let columns: any = null
    let columnsError: any = { message: 'RPC function not available' }
    
    try {
      const result = await supabase
        .rpc('get_table_columns', { table_name: 'profiles' })
      columns = result.data
      columnsError = result.error
    } catch (error) {
      // RPC function not available, use fallback method
    }
    
    let hasBetaStatus = false
    let profilesTableExists = true
    
    if (columnsError) {
      // Fallback: try to query the profiles table directly
      try {
        const { data: testData, error: testError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1)
        
        if (testError) {
          console.log('❌ Profiles table not accessible:', testError.message)
          profilesTableExists = false
        } else {
          console.log('✅ Profiles table accessible')
          
          // Try to select beta_status to see if it exists
          try {
            const { data: betaData, error: betaError } = await supabase
              .from('profiles')
              .select('beta_status')
              .limit(1)
            
            if (betaError && betaError.message.includes('column') && betaError.message.includes('does not exist')) {
              console.log('⚠️ beta_status column does not exist in profiles table')
              hasBetaStatus = false
            } else if (betaError) {
              console.log('❌ Error checking beta_status column:', betaError.message)
            } else {
              console.log('✅ beta_status column exists in profiles table')
              hasBetaStatus = true
            }
          } catch (betaError) {
            console.log('❌ Exception checking beta_status column:', betaError)
          }
        }
      } catch (error) {
        console.log('❌ Exception accessing profiles table:', error)
        profilesTableExists = false
      }
    } else if (columns) {
      hasBetaStatus = columns.some((col: any) => col.column_name === 'beta_status')
      console.log(`📊 Profiles table columns: ${columns.map((col: any) => col.column_name).join(', ')}`)
    }
    
    // Check user_role_summary view
    let userRoleSummaryExists = false
    try {
      const { data: viewData, error: viewError } = await supabase
        .from('user_role_summary')
        .select('user_id')
        .limit(1)
      
      if (viewError) {
        console.log('❌ user_role_summary view not accessible:', viewError.message)
      } else {
        console.log('✅ user_role_summary view accessible')
        userRoleSummaryExists = true
      }
    } catch (error) {
      console.log('❌ Exception accessing user_role_summary view:', error)
    }
    
    const migrationStatus = {
      profiles_table: {
        exists: profilesTableExists,
        has_beta_status: hasBetaStatus,
        status: profilesTableExists ? (hasBetaStatus ? 'complete' : 'missing_beta_status') : 'missing'
      },
      user_role_summary_view: {
        exists: userRoleSummaryExists,
        status: userRoleSummaryExists ? 'complete' : 'missing'
      },
      overall_status: profilesTableExists && hasBetaStatus && userRoleSummaryExists ? 'complete' : 'incomplete',
      recommendations: [] as string[]
    }
    
    // Add recommendations based on what's missing
    if (!profilesTableExists) {
      migrationStatus.recommendations.push('Create profiles table with proper schema')
    } else if (!hasBetaStatus) {
      migrationStatus.recommendations.push('Add beta_status column to profiles table')
      migrationStatus.recommendations.push('Run migration: 20250118000000_add_beta_status.sql')
    }
    
    if (!userRoleSummaryExists) {
      migrationStatus.recommendations.push('Create user_role_summary view')
      migrationStatus.recommendations.push('Run migration: 20250128000000_update_user_role_summary_beta_status.sql')
    }
    
    if (migrationStatus.recommendations.length === 0) {
      migrationStatus.recommendations.push('Database schema is up to date')
    }
    
    console.log('📋 Migration status:', migrationStatus)
    
    return NextResponse.json({
      success: true,
      migration_status: migrationStatus,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error checking migration status:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check migration status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
