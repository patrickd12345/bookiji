import { SimCityScenarioV2, SimCitySyntheticEnvelope, GovernanceAnnotation, deepFreeze } from "./types";
import { SimulatedEventPlan } from "./actors";

const DEFAULT_TIME_ORIGIN = 1_700_000_000_000; // deterministic fallback origin (2023-11)

export interface EnvelopeBuildInput {
  plan: SimulatedEventPlan;
  scenario: SimCityScenarioV2;
  runId: string;
  logicalTime: number;
  simTime: number;
  ordinal: number;
  governance: GovernanceAnnotation;
  forkOf?: string;
  baseline?: boolean;
}

export function buildSyntheticEnvelope(input: EnvelopeBuildInput): SimCitySyntheticEnvelope {
  const timeOrigin =
    input.scenario.timeOrigin ??
    input.scenario.baselineEnvelopes[0]?.timestamp ??
    DEFAULT_TIME_ORIGIN;
  const timestamp = timeOrigin + input.simTime;

  const metadata = {
    ...(input.plan.metadata ?? {}),
    simcity: {
      version: "v2" as const,
      synthetic: true as const,
      runId: input.runId,
      scenarioId: input.scenario.id,
      simTime: input.simTime,
      logicalTime: input.logicalTime,
      baseline: input.baseline,
      forkOf: input.forkOf,
      assumptions: [...input.scenario.assumptions],
      governance: input.governance,
      trustSafety: input.plan.trustSafetySignals
        ? { simulated: true as const, signals: input.plan.trustSafetySignals }
        : undefined,
    },
    evolution: input.scenario.evolution,
  };

  const envelope: SimCitySyntheticEnvelope = {
    id: `${input.runId}:${input.logicalTime}:${input.ordinal}:${input.plan.event.type}`,
    version: "v1",
    timestamp,
    timebase: {
      logical: input.logicalTime,
      simTime: input.simTime,
    },
    source: "simcity",
    event: input.plan.event,
    metadata,
    synthetic: true,
  };

  return deepFreeze(envelope);
}
