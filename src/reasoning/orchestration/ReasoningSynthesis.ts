import { Finding, PersonaAssessment, Uncertainty } from "./ReasoningPersona";

export interface DisagreementPosition {
  readonly persona: string;
  readonly finding: Finding;
}

export interface Disagreement {
  readonly id: string;
  readonly topic: string;
  readonly positions: readonly DisagreementPosition[];
  readonly signals: readonly string[];
  readonly assumptions: readonly string[];
}

export interface GovernanceSynthesisTrace {
  readonly domains: readonly string[];
  readonly blockedDomains: readonly string[];
  readonly deprecatedDomains: readonly string[];
  readonly registryVersion?: string;
}

export interface ReasoningSynthesis {
  question: string;

  consensus: readonly Finding[];
  disagreements: readonly Disagreement[];
  uncertainties: readonly Uncertainty[];

  confidence: number;
  notes: readonly string[];

  provenance: {
    readonly assessments: readonly PersonaAssessment[];
    readonly governance: GovernanceSynthesisTrace;
  };
}
