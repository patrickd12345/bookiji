export const featureFlags = {
  // Core Booking Flow - Beta Phase
  beta: {
    core_booking_flow: process.env.NODE_ENV === 'development' || process.env.BETA_CORE_BOOKING_FLOW === 'true',
  },
  
  // SLO Monitoring
  slo: {
    enabled: true,
    quote_endpoint_target_p95_ms: 500,
    quote_endpoint_target_p99_ms: 1000,
    confirm_endpoint_target_p95_ms: 500,
    confirm_endpoint_target_p99_ms: 1000,
  },
  
  // Payment Flow
  payments: {
    hold_amount_cents: 100, // $1.00
    hold_timeout_minutes: 15,
    auto_refund_on_timeout: true,
  },
  
  // Provider Confirmation
  provider: {
    confirmation_timeout_minutes: 15,
    auto_cancel_on_timeout: true,
  }
} as const

export type FeatureFlags = typeof featureFlags
