export interface FeatureFlags {
  core_booking_flow: boolean
  map_abstraction: boolean
  ai_radius_scaling: boolean
  loyalty_system: boolean
  provider_onboarding: boolean
  beta: {
    core_booking_flow: boolean
    map_abstraction: boolean
    ai_radius_scaling: boolean
    loyalty_system: boolean
    provider_onboarding: boolean
  }
  payments: {
    enabled: boolean
    stripe: boolean
    refunds: boolean
    hold_amount_cents: number
    hold_timeout_minutes: number
  }
  provider: {
    onboarding: boolean
    analytics: boolean
    reviews: boolean
    confirmation_timeout_minutes: number
  }
  slo: {
    enabled: boolean
    response_time: boolean
    availability: boolean
    quality: boolean
    quote_endpoint_target_p95_ms: number
    confirm_endpoint_target_p95_ms: number
    quote_endpoint_target_p99_ms: number
    confirm_endpoint_target_p99_ms: number
  }
}

// Pilot configuration - only enable for pilot organizations
export const PILOT_ORGS = [
  'pilot-org-1',
  'pilot-org-2',
  'pilot-org-3'
]

// Feature flag configuration
export const getFeatureFlags = (orgId?: string): FeatureFlags => {
  const isPilotOrg = orgId && PILOT_ORGS.includes(orgId)
  
  return {
    core_booking_flow: Boolean(isPilotOrg),
    map_abstraction: Boolean(isPilotOrg),
    ai_radius_scaling: Boolean(isPilotOrg),
    loyalty_system: Boolean(isPilotOrg),
    provider_onboarding: Boolean(isPilotOrg),
    beta: {
      core_booking_flow: Boolean(isPilotOrg),
      map_abstraction: Boolean(isPilotOrg),
      ai_radius_scaling: Boolean(isPilotOrg),
      loyalty_system: Boolean(isPilotOrg),
      provider_onboarding: Boolean(isPilotOrg)
    },
    payments: {
      enabled: Boolean(isPilotOrg),
      stripe: Boolean(isPilotOrg),
      refunds: Boolean(isPilotOrg),
      hold_amount_cents: 0, // Default value, will be overridden by development overrides
      hold_timeout_minutes: 0 // Default value, will be overridden by development overrides
    },
    provider: {
      onboarding: Boolean(isPilotOrg),
      analytics: Boolean(isPilotOrg),
      reviews: Boolean(isPilotOrg),
      confirmation_timeout_minutes: 0 // Default value, will be overridden by development overrides
    },
    slo: {
      enabled: Boolean(isPilotOrg),
      response_time: Boolean(isPilotOrg),
      availability: Boolean(isPilotOrg),
      quality: Boolean(isPilotOrg),
      quote_endpoint_target_p95_ms: 0, // Default value, will be overridden by development overrides
      confirm_endpoint_target_p95_ms: 0, // Default value, will be overridden by development overrides
      quote_endpoint_target_p99_ms: 0, // Default value, will be overridden by development overrides
      confirm_endpoint_target_p99_ms: 0 // Default value, will be overridden by development overrides
    }
  }
}

// Development overrides
export const getDevelopmentFlags = (): FeatureFlags => {
  if (process.env.NODE_ENV === 'development') {
    return {
      core_booking_flow: true,
      map_abstraction: true,
      ai_radius_scaling: true,
      loyalty_system: true,
      provider_onboarding: true,
      beta: {
        core_booking_flow: true,
        map_abstraction: true,
        ai_radius_scaling: true,
        loyalty_system: true,
        provider_onboarding: true
      },
      payments: {
        enabled: true,
        stripe: true,
        refunds: true,
        hold_amount_cents: 1000, // Override default for development
        hold_timeout_minutes: 10 // Override default for development
      },
      provider: {
        onboarding: true,
        analytics: true,
        reviews: true,
        confirmation_timeout_minutes: 15 // Override default for development
      },
      slo: {
        enabled: true,
        response_time: true,
        availability: true,
        quality: true,
        quote_endpoint_target_p95_ms: 0, // Override default for development
        confirm_endpoint_target_p95_ms: 0, // Override default for development
        quote_endpoint_target_p99_ms: 0, // Override default for development
        confirm_endpoint_target_p99_ms: 0 // Override default for development
      }
    }
  }
  
  return {
    core_booking_flow: false,
    map_abstraction: false,
    ai_radius_scaling: false,
    loyalty_system: false,
    provider_onboarding: false,
    beta: {
      core_booking_flow: false,
      map_abstraction: false,
      ai_radius_scaling: false,
      loyalty_system: false,
      provider_onboarding: false
    },
    payments: {
      enabled: false,
      stripe: false,
      refunds: false,
      hold_amount_cents: 0, // Override default for development
      hold_timeout_minutes: 0 // Override default for development
    },
    provider: {
      onboarding: false,
      analytics: false,
      reviews: false,
      confirmation_timeout_minutes: 0 // Override default for development
    },
    slo: {
      enabled: false,
      response_time: false,
      availability: false,
      quality: false,
      quote_endpoint_target_p95_ms: 0, // Override default for development
      confirm_endpoint_target_p95_ms: 0, // Override default for development
      quote_endpoint_target_p99_ms: 0, // Override default for development
      confirm_endpoint_target_p99_ms: 0 // Override default for development
    }
  }
}

// Default feature flags for development
export const featureFlags: FeatureFlags = getDevelopmentFlags()

// Feature flag hook for components
export const useFeatureFlag = (flag: string, orgId?: string): boolean => {
  const flags = getFeatureFlags(orgId)
  const devFlags = getDevelopmentFlags()
  
  // Handle nested properties
  if (flag.includes('.')) {
    const [category, subFlag] = flag.split('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (devFlags[category as keyof FeatureFlags] as any)?.[subFlag] || (flags[category as keyof FeatureFlags] as any)?.[subFlag] || false
  }
  
  // Handle flat properties
  const flatFlag = flag as keyof FeatureFlags
  if (typeof devFlags[flatFlag] === 'boolean') {
    return devFlags[flatFlag] as boolean
  }
  if (typeof flags[flatFlag] === 'boolean') {
    return flags[flatFlag] as boolean
  }
  
  return false
}

// Feature flag guard for API routes
export const requireFeatureFlag = (flag: string, orgId?: string): boolean => {
  const flags = getFeatureFlags(orgId)
  const devFlags = getDevelopmentFlags()
  
  // Handle nested properties
  if (flag.includes('.')) {
    const [category, subFlag] = flag.split('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (devFlags[category as keyof FeatureFlags] as any)?.[subFlag] || (flags[category as keyof FeatureFlags] as any)?.[subFlag] || false
  }
  
  // Handle flat properties
  const flatFlag = flag as keyof FeatureFlags
  if (typeof devFlags[flatFlag] === 'boolean') {
    return devFlags[flatFlag] as boolean
  }
  if (typeof flags[flatFlag] === 'boolean') {
    return flags[flatFlag] as boolean
  }
  
  return false
}

// Pilot organization management
export const addPilotOrg = (orgId: string): void => {
  if (!PILOT_ORGS.includes(orgId)) {
    PILOT_ORGS.push(orgId)
  }
}

export const removePilotOrg = (orgId: string): void => {
  const index = PILOT_ORGS.indexOf(orgId)
  if (index > -1) {
    PILOT_ORGS.splice(index, 1)
  }
}

export const isPilotOrg = (orgId?: string): boolean => {
  return orgId ? PILOT_ORGS.includes(orgId) : false
}
