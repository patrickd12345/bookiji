export interface FeatureFlags {
  core_booking_flow: boolean
  map_abstraction: boolean
  ai_radius_scaling: boolean
  loyalty_system: boolean
  provider_onboarding: boolean
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
    core_booking_flow: isPilotOrg,
    map_abstraction: isPilotOrg,
    ai_radius_scaling: isPilotOrg,
    loyalty_system: isPilotOrg,
    provider_onboarding: isPilotOrg
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
      provider_onboarding: true
    }
  }
  
  return {
    core_booking_flow: false,
    map_abstraction: false,
    ai_radius_scaling: false,
    loyalty_system: false,
    provider_onboarding: false
  }
}

// Feature flag hook for components
export const useFeatureFlag = (flag: keyof FeatureFlags, orgId?: string): boolean => {
  const flags = getFeatureFlags(orgId)
  const devFlags = getDevelopmentFlags()
  
  return devFlags[flag] || flags[flag]
}

// Feature flag guard for API routes
export const requireFeatureFlag = (flag: keyof FeatureFlags, orgId?: string): boolean => {
  const flags = getFeatureFlags(orgId)
  const devFlags = getDevelopmentFlags()
  
  return devFlags[flag] || flags[flag]
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
