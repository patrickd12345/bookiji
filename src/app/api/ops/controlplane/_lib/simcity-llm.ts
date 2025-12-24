/**
 * LLM Adapter for SimCity Proposal Generation
 *
 * Rules:
 * - Stateless
 * - No engine imports
 * - No side effects
 * - Fully mockable
 * - Returns empty array on failure (never throws)
 */

export type SimCityLLMSnapshot = {
  tick: number
  recentEvents: Array<{
    id: string
    tick: number
    domain: string
    type: string
    payload: Record<string, unknown>
  }>
  enabledDomains: string[]
  config: {
    seed: number
    scenarios?: string[]
  }
}

export type LLMProposalDraft = {
  domain: string
  action: string
  description: string
  confidence?: number
  evidenceHints?: string[]
}

/**
 * Generate proposal drafts from LLM based on SimCity state snapshot.
 *
 * This function is sandboxed and must not:
 * - Import from simcity.ts or simcity-domains.ts
 * - Mutate any external state
 * - Throw errors (returns [] on failure)
 * - Make network calls in CI (must be mockable)
 *
 * @param snapshot - Current SimCity state snapshot
 * @returns Array of proposal drafts (empty on failure)
 */
export async function generateLLMProposals(
  _snapshot: SimCityLLMSnapshot
): Promise<LLMProposalDraft[]> {
  // Fail-closed: return empty array if LLM is not available or fails
  try {
    // Check if we're in CI or if LLM is disabled
    const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'test'
    const llmEnabled = process.env.SIMCITY_LLM_ENABLED === 'true'

    if (isCI || !llmEnabled) {
      // In CI or when disabled, return empty array (no network calls)
      return []
    }

    // In non-CI environments with LLM enabled, we would call an LLM service here
    // For now, we return empty array to maintain fail-closed behavior
    // This can be extended later with actual LLM integration

    // Example structure for future implementation:
    // const response = await fetch(LLM_ENDPOINT, {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     tick: snapshot.tick,
    //     events: snapshot.recentEvents,
    //     domains: snapshot.enabledDomains,
    //   }),
    // })
    // if (!response.ok) return []
    // const drafts = await response.json()
    // return normalizeLLMResponse(drafts)

    return []
  } catch {
    // Never throw - fail closed
    return []
  }
}

/**
 * Normalize LLM confidence to [0, 1] range.
 * Handles various formats (0-1, 0-100, etc.)
 */
export function normalizeLLMConfidence(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0.5 // Default confidence if invalid
  }

  // If value is > 1, assume it's 0-100 scale
  if (value > 1) {
    return Math.max(0, Math.min(1, value / 100))
  }

  return Math.max(0, Math.min(1, value))
}

