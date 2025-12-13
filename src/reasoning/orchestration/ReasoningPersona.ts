import { ReasoningTask } from "./ReasoningTask";

export interface Finding {
  readonly id: string;
  readonly topic: string;
  readonly summary: string;
  readonly judgment: "risk" | "issue" | "observation" | "positive" | "unknown";
  readonly signals: readonly string[];
  readonly assumptions: readonly string[];
  readonly domain?: string;
  readonly confidence: number; // 0..1
  readonly provenance?: readonly string[];
}

export interface Uncertainty {
  readonly id: string;
  readonly topic: string;
  readonly description: string;
  readonly signals: readonly string[];
  readonly missingSignals?: readonly string[];
  readonly severity: "low" | "medium" | "high";
}

export interface PersonaAssessment {
  readonly persona: string;
  readonly scope: string;
  readonly findings: readonly Finding[];
  readonly uncertainties: readonly Uncertainty[];
  readonly assumptions: readonly string[];
  readonly signals: readonly string[];
  readonly governance: {
    readonly permittedDomains: readonly string[];
    readonly blockedDomains: readonly string[];
  };
  readonly confidence: number; // 0..1
  readonly reasoningTrace: readonly string[];
}

export interface ReasoningPersona {
  readonly id: string;
  readonly label: string;
  readonly scope: string;
  readonly domains: readonly string[];
  readonly maxDepth?: number;
  assess(task: ReasoningTask): Promise<PersonaAssessment> | PersonaAssessment;
}
