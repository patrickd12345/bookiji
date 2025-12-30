import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseConfig } from '@/config/supabase'
import { isTruthyEnv } from '@/lib/env/isTruthyEnv'

export interface CreditsBalanceResponse {
  success: boolean
  credits?: {
    user_id: string
    balance_cents: number
    total_purchased_cents: number
    total_used_cents: number
    created_at: string
    updated_at: string
  }
  balance_dollars?: number
  mock?: boolean
  message?: string
  error?: string
}

export interface CreditsBalanceHandler {
  handle(request: NextRequest): Promise<NextResponse<CreditsBalanceResponse>>
}

export class CreditsBalanceHandlerImpl implements CreditsBalanceHandler {
  async handle(request: NextRequest): Promise<NextResponse<CreditsBalanceResponse>> {
    try {
      const isE2E = isTruthyEnv(process.env.NEXT_PUBLIC_E2E) || isTruthyEnv(process.env.E2E)
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
      const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : null

      const cookieStore = await cookies()
      const config = getSupabaseConfig()
      const supabase = createServerClient(config.url, config.publishableKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {}
          }
        }
      })

      const { data: { user }, error: authError } = bearerToken
        ? await supabase.auth.getUser(bearerToken)
        : await supabase.auth.getUser()
      
      if (authError || !user) {
        // Fallback to query param for backward compatibility
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get("userId")
        
        if (!userId) {
          if (isE2E) {
            const mockCredits = {
              user_id: 'e2e-user',
              balance_cents: 2500,
              total_purchased_cents: 5000,
              total_used_cents: 2500,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
            return NextResponse.json({
              success: true,
              credits: mockCredits,
              balance_dollars: mockCredits.balance_cents / 100,
              mock: true,
              message: "Mock credit balance retrieved successfully"
            })
          }
          return NextResponse.json(
            { error: "Unauthorized - User ID is required", success: false }, 
            { status: 401 }
          )
        }
        
        console.log("Fetching credit balance for user (from query param):", userId)
        
        const mockCredits = {
          user_id: userId,
          balance_cents: 2500,
          total_purchased_cents: 5000,
          total_used_cents: 2500,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        return NextResponse.json({
          success: true,
          credits: mockCredits,
          balance_dollars: mockCredits.balance_cents / 100,
          mock: true,
          message: "Mock credit balance retrieved successfully"
        })
      }

      console.log("Fetching credit balance for user:", user.id)

      const mockCredits = {
        user_id: user.id,
        balance_cents: 2500,
        total_purchased_cents: 5000,
        total_used_cents: 2500,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log("Using mock credit balance")

      return NextResponse.json({
        success: true,
        credits: mockCredits,
        balance_dollars: mockCredits.balance_cents / 100,
        mock: true,
        message: "Mock credit balance retrieved successfully"
      })

    } catch (error) {
      console.error("Error in credit balance API:", error)
      return NextResponse.json({
        success: false,
        error: "Failed to fetch credit balance",
        mock: true
      }, { status: 500 })
    }
  }
}

export function createCreditsBalanceHandler(): CreditsBalanceHandler {
  return new CreditsBalanceHandlerImpl()
} 
