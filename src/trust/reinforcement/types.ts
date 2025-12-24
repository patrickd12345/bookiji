// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AuditFrame, AuditTimeline, TimelineGovernance, EnvelopeProvenance } from "@/audit/types";
import { EvolutionFlags } from "@/governance/EvolutionFlags";
import { DomainRegistryEntry } from "@/governance/DomainRegistry";

export type RiskDimension = "fraudLikelihood" | "noShowHazard" | "providerReliability" | "abuseRisk";

export type RiskConfidence = "low" | "medium" | "high";

export interface RiskMetric {
  readonly dimension: RiskDimension;
  readonly value: number;
  readonly trend: "up" | "down" | "flat";
  readonly confidence: RiskConfidence;
  readonly signals: readonly string[];
  readonly rationale: string;
}

export interface RiskStateSnapshot {
  readonly id: string;
  readonly frameId: string;
  readonly timelineId: string;
  readonly domain: string;
  readonly timestamp: number;
  readonly logicalTime: number;
  readonly provenance: EnvelopeProvenance;
  readonly metrics: readonly RiskMetric[];
  readonly signals: readonly string[];
  readonly assumptions: readonly string[];
  readonly governance: TimelineGovernance;
  readonly evolution?: EvolutionFlags;
  readonly syntheticContext?: AuditFrame["syntheticContext"];
}

export interface RiskTrajectory {
  readonly id: string;
  readonly timelineId: string;
  readonly startedAt: number;
  readonly endedAt: number;
  readonly snapshots: readonly RiskStateSnapshot[];
  readonly derivedFrom: {
    readonly frameIds: readonly string[];
    readonly timelineStartedAt: number;
  };
  readonly warnings: readonly string[];
  readonly replayCompatible: boolean;
}

export type ThresholdComparator = "gt" | "gte" | "lt" | "lte";

export interface TrustSafetyThreshold {
  readonly id: string;
  readonly domain: string;
  readonly dimension: RiskDimension;
  readonly comparator: ThresholdComparator;
  readonly value: number;
  readonly contractVersion: string;
  readonly label: string;
  readonly interventionClass: "observe" | "notify" | "throttle" | "pause" | "investigate";
  readonly deprecated?: boolean;
  readonly evolution?: EvolutionFlags;
  readonly description?: string;
}

export interface ThresholdCrossing {
  readonly thresholdId: string;
  readonly snapshotId: string;
  readonly dimension: RiskDimension;
  readonly value: number;
  readonly comparator: ThresholdComparator;
  readonly crossed: boolean;
  readonly occurredAt: number;
  readonly evolution?: EvolutionFlags;
  readonly signals: readonly string[];
  readonly governance: TimelineGovernance;
  readonly confidence: RiskConfidence;
}

export interface InterventionJustification {
  readonly id: string;
  readonly domain: string;
  readonly threshold: TrustSafetyThreshold;
  readonly snapshotId: string;
  readonly decision: "justified" | "blocked" | "deferred";
  readonly whyNow: string;
  readonly whyNotEarlier: string;
  readonly whyThisIntervention: string;
  readonly governance: TimelineGovernance & { readonly registryEntry?: DomainRegistryEntry };
  readonly confidence: RiskConfidence;
  readonly signals: readonly string[];
  readonly assumptions: readonly string[];
  readonly contractsReferenced: readonly string[];
}

export interface CounterfactualObservation {
  readonly timelineId: string;
  readonly trajectoryId: string;
  readonly meanRisk: number;
  readonly cancellations: number;
  readonly anomalies: number;
  readonly latencyP95Ms?: number;
  readonly syntheticShare?: number;
  readonly evolution?: EvolutionFlags;
}

export interface InterventionCounterfactual {
  readonly id: string;
  readonly baseline: CounterfactualObservation;
  readonly variant: CounterfactualObservation;
  readonly delta: {
    readonly risk: number;
    readonly cancellations: number;
    readonly anomalies: number;
    readonly latencyP95Ms?: number;
  };
  readonly signals: readonly string[];
  readonly assumptions: readonly string[];
  readonly replayCompatible: boolean;
  readonly governanceNotes: readonly string[];
}
