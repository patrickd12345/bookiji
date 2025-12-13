import { ReasoningSynthesis, Disagreement } from "@/reasoning/orchestration";
import {
  DeploymentEnvironment,
  DeploymentEnvironmentClassification,
  DeploymentFingerprint,
  ReasoningConfigHash,
} from "./deploymentFingerprint";
import { ExternalAdapterPolicy } from "../adapters/policy";

export type {
  DeploymentEnvironment,
  DeploymentEnvironmentClassification,
  DeploymentFingerprint,
  ReasoningConfigHash,
} from "./deploymentFingerprint";
export type { ExternalAdapterPolicy } from "../adapters/policy";
export type {
  ArtifactEvidence,
  FullDisclosureAuditReport,
  FullDisclosureLimits,
  InputClosureEntry,
} from "./fullDisclosureAuditReport";

export type HashAlgorithm = "sha256";

export interface GovernanceSnapshots {
  readonly registry_hash: string;
  readonly evolution_hash: string;
}

export interface ReasoningArtifactIdentity {
  readonly artifact_version: "reasoning-artifact/v1";
  readonly artifact_id: string;
  readonly logical_time: number;
  readonly wall_time?: number;
}

export interface ArtifactProvenance {
  readonly system: string;
  readonly system_version: string;
  readonly phase: "12";
  readonly genome_hash: string;
  readonly governance: GovernanceSnapshots;
  readonly deployment: DeploymentFingerprint;
  readonly external_adapters: ExternalAdapterPolicy;
  readonly external_adapter_usage?: readonly string[];
}

export interface ArtifactInputsDigests {
  readonly analytics: string;
  readonly simcity?: string;
  readonly audit?: string;
  readonly trust?: string;
}

export interface PersonaJudgment {
  readonly topic: string;
  readonly position: string;
  readonly rationale_digests: readonly string[];
}

export type UncertaintySource = "signal_gap" | "signal_conflict" | "synthetic_context" | "governance_block" | "other";

export interface PersonaUncertainty {
  readonly id: string;
  readonly topic: string;
  readonly confidence_level: "low" | "medium" | "high";
  readonly sources: readonly UncertaintySource[];
  readonly irreducible: boolean;
}

export interface PersonaArtifact {
  readonly persona_id: string;
  readonly persona_type: string;
  readonly inputs_digest: string;
  readonly judgments: readonly PersonaJudgment[];
  readonly uncertainties: readonly PersonaUncertainty[];
  readonly provenance: {
    readonly origin: string;
    readonly version?: string;
  };
}

export interface SynthesisConsensusEntry {
  readonly topic: string;
  readonly position: string;
  readonly personas: readonly string[];
}

export interface SynthesisDisagreementEntry {
  readonly topic: string;
  readonly positions: readonly {
    readonly persona_id: string;
    readonly position: string;
  }[];
}

export interface SynthesisSection {
  readonly consensus: readonly SynthesisConsensusEntry[];
  readonly disagreements: readonly SynthesisDisagreementEntry[];
  readonly uncertainties: ReasoningSynthesis["uncertainties"];
}

export interface GuaranteesSection {
  readonly deterministic: boolean;
  readonly replayable: boolean;
  readonly non_agency: boolean;
  readonly disclaimers: readonly string[];
}

export interface VerificationHooks {
  readonly hash_algorithm: HashAlgorithm;
  readonly replay_seed: string;
  readonly steps: readonly string[];
}

export interface HumanReview {
  readonly reviewed: boolean;
  readonly reviewer_id?: string;
  readonly notes_digest?: string;
}

export interface ReasoningArtifact {
  readonly identity: ReasoningArtifactIdentity;
  readonly provenance: ArtifactProvenance;
  readonly inputs: ArtifactInputsDigests;
  readonly personas: readonly PersonaArtifact[];
  readonly synthesis: SynthesisSection;
  readonly guarantees: GuaranteesSection;
  readonly verification: VerificationHooks;
  readonly human?: HumanReview;
}
