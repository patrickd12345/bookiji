import { AnalyticsEnvelope } from "@/contracts/analytics/AnalyticsEnvelope";
import { EvolutionFlags } from "@/governance/EvolutionFlags";
import { DeprecationPolicy } from "@/governance/DeprecationPolicy";
import { DomainRegistry, DomainRegistryEntry } from "@/governance/DomainRegistry";

export type EnvelopeProvenance = "real" | "synthetic";

export interface TimelineGovernance {
  readonly domain: string;
  readonly permitted: boolean;
  readonly reason?: string;
  readonly evolution?: EvolutionFlags;
  readonly deprecation?: DeprecationPolicy;
  readonly registryEntry?: DomainRegistryEntry;
}

export interface TrustSafetySnapshot {
  readonly provenance: EnvelopeProvenance;
  readonly signals: readonly string[];
}

export interface AuditFrame {
  readonly id: string;
  readonly index: number;
  readonly logicalTime: number;
  readonly timestamp: number;
  readonly simTime?: number;
  readonly envelope: AnalyticsEnvelope;
  readonly provenance: EnvelopeProvenance;
  readonly governance: TimelineGovernance;
  readonly evolution?: EvolutionFlags;
  readonly trustSafety?: TrustSafetySnapshot;
  readonly syntheticContext?: {
    readonly runId?: string;
    readonly scenarioId?: string;
    readonly forkOf?: string;
    readonly baseline?: boolean;
  };
}

export interface AuditTimeline {
  readonly id: string;
  readonly frames: readonly AuditFrame[];
  readonly startedAt: number;
  readonly endedAt: number;
  readonly registry?: DomainRegistry;
  readonly sources: {
    readonly real: number;
    readonly synthetic: number;
  };
  readonly domains: readonly string[];
  readonly evolutionFlags: Readonly<Record<string, EvolutionFlags | undefined>>;
}

export interface TimelineBuildOptions {
  readonly id?: string;
  readonly envelopes: readonly AnalyticsEnvelope[];
  readonly registry?: DomainRegistry;
  readonly allowSynthetic?: boolean;
  readonly evolutionOverrides?: Record<string, EvolutionFlags>;
}

export interface ReplayCursor {
  readonly timelineId: string;
  readonly position: number;
  readonly completed: boolean;
}

export interface ReplayState {
  readonly position: number;
  readonly lastFrame?: AuditFrame;
  readonly eventCounts: Readonly<Record<string, number>>;
  readonly syntheticSeen: number;
  readonly realSeen: number;
  readonly lastSignals: readonly string[];
}

export interface ReplayResult {
  readonly cursor: ReplayCursor;
  readonly frame?: AuditFrame;
  readonly state: ReplayState;
}

export interface DiffExplanation {
  readonly description: string;
  readonly signals: readonly string[];
  readonly governance: TimelineGovernance;
  readonly evolution?: EvolutionFlags;
  readonly syntheticContext?: AuditFrame["syntheticContext"];
}

export interface TimelineDiff {
  readonly baselineId: string;
  readonly comparisonId: string;
  readonly missingInComparison: readonly string[];
  readonly missingInBaseline: readonly string[];
  readonly metricDivergence: Readonly<Record<string, number>>;
  readonly trustSafetyChanges: readonly string[];
  readonly sloImpacts: Readonly<{
    latencyP95Delta?: number;
    bookingDelta?: number;
    cancellationDelta?: number;
  }>;
  readonly explanations: readonly DiffExplanation[];
}
