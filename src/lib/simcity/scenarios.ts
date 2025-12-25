import { ScenarioOverride } from './types'

// Scenario overrides for the live tick engine (synthetic load only).
export const SCENARIO_OVERRIDES: Record<string, ScenarioOverride> = {
  baseline: {
    id: 'baseline',
    label: 'Baseline / steady',
    spawnRate: 1,
    confirmRate: 0.7,
    cancelRate: 0.1,
    description: 'Even traffic with nominal confirmation and cancellation rates.',
  },
  spike: {
    id: 'spike',
    label: 'Traffic Spike',
    spawnRate: 2.2,
    confirmRate: 0.8,
    cancelRate: 0.08,
    priceMultiplier: 1.1,
    tags: ['hot-hour'],
    description: 'High load period for warming up the OpsAI dashboards.',
  },
  hyperloop: {
    id: 'hyperloop',
    label: '10x Hyper-speed',
    spawnRate: 1.4,
    confirmRate: 0.6,
    cancelRate: 0.18,
    clockMultiplier: 10,
    tags: ['warp'],
    description: 'Accelerate synthetic time to validate speed controls.',
  },
  vendor_sla: {
    id: 'vendor_sla',
    label: 'Vendor SLA (30m)',
    durationMinutes: 30,
    spawnRate: 1.2,
    confirmRate: 0.9,
    cancelRate: 0.05,
    priceMultiplier: 1.05,
    tags: ['vendor', 'sla'],
    description: 'Prioritize vendor interactions and responsiveness for a 30-minute burn-in.',
  },
}

// In-memory store for dynamically created scenarios (from natural language)
const dynamicScenarios = new Map<string, ScenarioOverride>()

export function registerDynamicScenario(override: ScenarioOverride): void {
  dynamicScenarios.set(override.id, override)
}

export function getDynamicScenario(id: string): ScenarioOverride | undefined {
  return dynamicScenarios.get(id)
}

export const resolveScenarioOverride = (scenario?: string | null): ScenarioOverride => {
  if (!scenario) return SCENARIO_OVERRIDES.baseline
  
  // Check dynamic scenarios first
  const dynamic = dynamicScenarios.get(scenario)
  if (dynamic) return dynamic
  
  // Then check static overrides
  return SCENARIO_OVERRIDES[scenario] ?? SCENARIO_OVERRIDES.baseline
}
