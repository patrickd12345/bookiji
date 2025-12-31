import { NextResponse } from 'next/server'
import { initializeDatabase, userService } from '@/lib/database'

export async function GET() {
  try {
    console.warn('🗄️ Testing Database Connection...')
    
    // Test 1: Database connection
    console.warn('1️⃣ Testing database connection...')
    const isConnected = await initializeDatabase()
    console.warn(`   Database connected: ${isConnected ? '✅' : '❌'}`)
    
    if (!isConnected) {
      return NextResponse.json({ 
        error: 'Database connection failed. Check your Supabase configuration.' 
      }, { status: 500 })
    }
    
    // Test 2: Get current user (if authenticated)
    console.warn('2️⃣ Testing user service...')
    const currentUser = await userService.getCurrentUser()
    console.warn(`   Current user: ${currentUser ? '✅ Found' : '❌ Not authenticated'}`)
    
    // Test 3: Test profile creation (if user exists)
    if (currentUser) {
      console.warn('3️⃣ Testing profile update...')
      const updatedProfile = await userService.upsertProfile({
        updated_at: new Date().toISOString()
      })
      console.warn(`   Profile updated: ${updatedProfile ? '✅' : '❌'}`)
    }
    
    console.warn('🎉 Database tests completed!')
    
    return NextResponse.json({
      success: true,
      databaseConnected: isConnected,
      currentUser: currentUser ? {
        id: currentUser.id,
        role: currentUser.role,
        hasProfile: !!currentUser.full_name
      } : null,
      message: 'Database is ready for Bookiji!'
    })
    
  } catch (error) {
    console.error('❌ Database test failed:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
} 