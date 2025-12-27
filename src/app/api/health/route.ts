import { NextResponse } from 'next/server'
import { getAuthenticatedUserId } from '../_utils/auth'

/**
 * Simple health check endpoint for CI/CD and monitoring
 * 
 * Supports both authenticated and unauthenticated requests:
 * - Unauthenticated: Returns basic health status
 * - Authenticated: Returns health status + user context
 */
export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request)
    
    const healthData: {
      status: string
      timestamp: string
      version: string
      environment: string
      authenticated?: boolean
      userId?: string
    } = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'development'
    }

    if (userId) {
      healthData.authenticated = true
      healthData.userId = userId
    }

    return NextResponse.json(healthData)
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}