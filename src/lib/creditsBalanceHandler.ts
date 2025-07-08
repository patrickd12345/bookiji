import { NextRequest, NextResponse } from 'next/server'

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
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get("userId");

      if (!userId) {
        return NextResponse.json(
          { error: "User ID is required", success: false }, 
          { status: 400 }
        );
      }

      console.log("Fetching credit balance for user:", userId);

      const mockCredits = {
        user_id: userId,
        balance_cents: 2500,
        total_purchased_cents: 5000,
        total_used_cents: 2500,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log("Using mock credit balance");

      return NextResponse.json({
        success: true,
        credits: mockCredits,
        balance_dollars: mockCredits.balance_cents / 100,
        mock: true,
        message: "Mock credit balance retrieved successfully"
      });

    } catch (error) {
      console.error("Error in credit balance API:", error);
      return NextResponse.json({
        success: false,
        error: "Failed to fetch credit balance",
        mock: true
      }, { status: 500 });
    }
  }
}

export function createCreditsBalanceHandler(): CreditsBalanceHandler {
  return new CreditsBalanceHandlerImpl()
} 