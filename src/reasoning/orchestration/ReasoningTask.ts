import { AnalyticsEnvelope } from "@/contracts/analytics/AnalyticsEnvelope";
import { AuditTimeline } from "@/audit/types";
import { DomainRegistry } from "@/governance/DomainRegistry";
import { RiskTrajectory } from "@/trust/reinforcement/types";

export interface SimCityScenarioResult {
  readonly scenarioId: string;
  readonly label?: string;
  readonly domains: readonly string[];
  readonly envelopes?: readonly AnalyticsEnvelope[];
  readonly signals: readonly string[];
  readonly summary?: string;
}

export interface GovernanceContext {
  readonly registry: DomainRegistry;
  readonly allowSynthetic?: boolean;
  readonly allowDeprecated?: boolean;
  readonly maxTimeMs?: number;
  readonly maxTokens?: number;
}

export interface ReasoningInputs {
  readonly analytics?: readonly AnalyticsEnvelope[];
  readonly simcity?: SimCityScenarioResult;
  readonly audit?: AuditTimeline;
  readonly trust?: readonly RiskTrajectory[];
}

export interface ReasoningTask {
  readonly question: string;
  readonly inputs: ReasoningInputs;
  readonly constraints: GovernanceContext;
}
