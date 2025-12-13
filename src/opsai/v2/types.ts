import { AnalyticsEnvelope } from "@/contracts/analytics/AnalyticsEnvelope";
import { EvolutionFlags } from "@/governance/EvolutionFlags";
import { DeprecationPolicy } from "@/governance/DeprecationPolicy";
import { GovernanceContract } from "@/governance/GovernanceContract";

export type OpsAIArtifactKind = "insight" | "prediction" | "counterfactual" | "explanation";

export interface OpsAIGovernanceTrace {
  domain: string;
  contractVersion: string;
  contract?: GovernanceContract;
  evolution?: EvolutionFlags;
  deprecation?: DeprecationPolicy;
  permitted: boolean;
  reason?: string;
}

export interface OpsAIArtifactBase {
  readonly id: string;
  readonly kind: OpsAIArtifactKind;
  readonly envelopeId: string;
  readonly createdAt: number;
  readonly source: AnalyticsEnvelope["source"];
  readonly governance: OpsAIGovernanceTrace;
}

export interface OpsAIInsight extends OpsAIArtifactBase {
  readonly kind: "insight";
  readonly summary: string;
  readonly signals: string[];
  readonly diagnostics: Record<string, unknown>;
  readonly evolutionFlags?: EvolutionFlags;
}

export interface OpsAIPrediction extends OpsAIArtifactBase {
  readonly kind: "prediction";
  readonly horizonMs: number;
  readonly metrics: {
    anomalyLikelihood: number;
    sloBreachProbability: number;
    stressForecast: number;
  };
  readonly basis: string[];
}

export interface OpsAICounterfactual extends OpsAIArtifactBase {
  readonly kind: "counterfactual";
  readonly scenario: string;
  readonly baseline: Record<string, number>;
  readonly simulated: Record<string, number>;
  readonly deltas: Record<string, number>;
  readonly assumptions: string[];
  readonly simCity?: {
    runId?: string;
    scenarioId?: string;
    simTime?: number;
  };
}

export interface OpsAIExplanation extends OpsAIArtifactBase {
  readonly kind: "explanation";
  readonly steps: string[];
  readonly contractsReferenced: string[];
  readonly assumptions: string[];
  readonly signalsUsed: string[];
}

export type OpsAIArtifact = OpsAIInsight | OpsAIPrediction | OpsAICounterfactual | OpsAIExplanation;

export interface OpsAIv2Config {
  enabled?: boolean;
  evolutionFlags?: Record<string, EvolutionFlags>;
  trustSafetySchemas?: string[];
}

export interface OpsAIv2Result {
  mode: "v2" | "v1-fallback" | "governance-blocked";
  artifacts: OpsAIArtifact[];
  fallback?: import("../contracts/OpsAIEventContract").OpsAIEventContract;
}
