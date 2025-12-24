import { AnalyticsEnvelope } from "@/contracts/analytics/AnalyticsEnvelope";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { StandardizedEvent } from "@/contracts/analytics/StandardizedEvent";
import { EvolutionFlags } from "@/governance/EvolutionFlags";
import { DomainRegistry, DomainRegistryEntry } from "@/governance/DomainRegistry";

export type ActorKind = "user" | "provider" | "system";

export type PerturbationType = "demandSpike" | "providerDrop" | "cancellationBias" | "latencyInflation" | "trustSignal";

export interface ScenarioPerturbation {
  readonly type: PerturbationType;
  readonly domain: string;
  readonly magnitude: number;
  readonly description: string;
}

export interface ScenarioProvenance {
  readonly source: "scenario-compiler";
  readonly compiledAt: number;
  readonly description: string;
  readonly intent?: string;
  readonly constraints?: string[];
  readonly forkFrom?: string;
}

export interface SimCityActorModel {
  readonly id: string;
  readonly kind: ActorKind;
  readonly domain: string;
  readonly seed: number;
  readonly assumptions: string[];
}

export interface SimCityScenarioV2 {
  readonly id: string;
  readonly label: string;
  readonly seed: number;
  readonly baselineEnvelopes: readonly AnalyticsEnvelope[];
  readonly actors: readonly SimCityActorModel[];
  readonly assumptions: readonly string[];
  readonly timeOrigin?: number;
  readonly evolution?: EvolutionFlags;
  readonly perturbations?: readonly ScenarioPerturbation[];
  readonly provenance?: ScenarioProvenance;
  readonly confidence?: number;
}

export interface SimCityMarketState {
  readonly tick: number;
  readonly logicalTime: number;
  readonly demandLevel: number;
  readonly providersAvailable: number;
  readonly cancellations: number;
  readonly noShows: number;
  readonly retries: number;
  readonly stressIndex: number;
  readonly queueDepth: number;
}

export interface GovernanceAnnotation {
  readonly domain: string;
  readonly permitted: boolean;
  readonly reason?: string;
  readonly evolution?: EvolutionFlags;
}

export interface SimCitySyntheticEnvelope extends AnalyticsEnvelope {
  readonly synthetic: true;
  readonly metadata: Record<string, unknown> & {
    simcity: {
      version: "v2";
      synthetic: true;
      runId: string;
      scenarioId: string;
      simTime: number;
      logicalTime: number;
      baseline?: boolean;
      forkOf?: string;
      assumptions: string[];
      governance: GovernanceAnnotation;
      trustSafety?: { simulated: true; signals: string[] };
    };
    evolution?: EvolutionFlags;
  };
}

export interface HistoricalProfile {
  readonly demandPerTick: number[];
  readonly cancellationsPerTick: number[];
  readonly providersPerTick: number[];
  readonly avgLatencyMs: number;
}

export interface MarketSimulationConfig {
  readonly scenario: SimCityScenarioV2;
  readonly registry: DomainRegistry;
  readonly seed: number;
  readonly horizon: number;
  readonly forkOf?: string;
  readonly demandShock?: number;
  readonly providerShock?: number;
  readonly cancellationBias?: number;
}

export interface MarketSimulationResult {
  readonly runId: string;
  readonly envelopes: SimCitySyntheticEnvelope[];
  readonly states: SimCityMarketState[];
  readonly profile: HistoricalProfile;
}

export interface CounterfactualChange {
  readonly kind: "demand" | "provider" | "cancellation";
  readonly magnitude: number;
}

export interface CounterfactualResult {
  readonly baseline: MarketSimulationResult;
  readonly variant: MarketSimulationResult;
  readonly delta: {
    readonly bookings: number;
    readonly cancellations: number;
    readonly stress: number;
  };
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach((child) => deepFreeze(child as unknown as T));
  }
  return value;
}

export function assertRegistered(domain: string, registry: DomainRegistry): DomainRegistryEntry {
  const entry = registry.entries.find((candidate) => candidate.domain === domain);
  if (!entry) {
    throw new Error(`Domain "${domain}" is not in the governance registry`);
  }
  if (entry.deprecation?.willDeprecate) {
    throw new Error(`Domain "${domain}" is marked deprecated${entry.deprecation.sunsetDate ? ` (sunsets ${entry.deprecation.sunsetDate})` : ""}`);
  }
  return entry;
}
