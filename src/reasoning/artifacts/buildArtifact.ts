import { ReasoningSynthesis } from "@/reasoning/orchestration";
import { deterministicHash } from "./hash";
import { verifyDeploymentFingerprint } from "./deploymentFingerprint";
import { assertExternalAdapterPolicy, ExternalAdapterPolicy } from "../adapters/policy";
import {
  ArtifactInputsDigests,
  ArtifactProvenance,
  GuaranteesSection,
  PersonaArtifact,
  PersonaJudgment,
  PersonaUncertainty,
  ReasoningArtifact,
  ReasoningArtifactIdentity,
  SynthesisConsensusEntry,
  SynthesisDisagreementEntry,
  VerificationHooks,
} from "./types";

export interface BuildReasoningArtifactOptions {
  readonly synthesis: ReasoningSynthesis;
  readonly inputs: ArtifactInputsDigests;
  readonly provenance: ArtifactProvenance;
  readonly logical_time: number;
  readonly wall_time?: number;
  readonly replay_seed: string;
  readonly personaInputs: Record<string, string>;
  readonly personaTypes?: Record<string, string>;
  readonly human?: ReasoningArtifact["human"];
  readonly externalAdapterUsage?: readonly string[];
}

function normalizePosition(topic: string, summary: string, judgment: string): string {
  return `${topic}:${judgment}:${summary}`;
}

function toPersonaJudgments(
  findings: ReasoningSynthesis["provenance"]["assessments"][number]["findings"],
  topicFallback: string
): PersonaJudgment[] {
  return findings.map((finding) => {
    const topic = finding.topic || finding.id || topicFallback;
    const position = normalizePosition(topic, finding.summary, finding.judgment);
    const rationale_digests = [
      deterministicHash({
        signals: finding.signals,
        assumptions: finding.assumptions,
        provenance: finding.provenance ?? [],
      }),
    ];
    return { topic, position, rationale_digests };
  });
}

function mapUncertaintySeverity(severity?: "low" | "medium" | "high"): "low" | "medium" | "high" {
  if (severity === "high" || severity === "medium") return severity;
  return "low";
}

function deriveUncertaintySource(signals?: readonly string[]): "signal_gap" | "signal_conflict" | "other" {
  if (!signals || signals.length === 0) return "signal_gap";
  if (signals.length > 1) return "signal_conflict";
  return "other";
}

function toPersonaUncertainties(
  uncertainties: ReasoningSynthesis["provenance"]["assessments"][number]["uncertainties"]
): PersonaUncertainty[] {
  if (!uncertainties.length) {
    return [
      {
        id: "unspecified-uncertainty",
        topic: "unspecified",
        confidence_level: "low",
        sources: ["signal_gap"],
        irreducible: true,
      },
    ];
  }

  return uncertainties.map((uncertainty) => ({
    id: uncertainty.id,
    topic: uncertainty.topic,
    confidence_level: mapUncertaintySeverity(uncertainty.severity),
    sources: [deriveUncertaintySource(uncertainty.signals)],
    irreducible: true,
  }));
}

function buildPersonaArtifacts(
  options: BuildReasoningArtifactOptions,
  guarantees: GuaranteesSection
): PersonaArtifact[] {
  const personaTypes = options.personaTypes ?? {};
  return options.synthesis.provenance.assessments.map((assessment) => ({
    persona_id: assessment.persona,
    persona_type: personaTypes[assessment.persona] ?? assessment.scope ?? "unspecified",
    inputs_digest: options.personaInputs[assessment.persona] ?? options.inputs.analytics,
    judgments: toPersonaJudgments(assessment.findings, assessment.persona),
    uncertainties: toPersonaUncertainties(assessment.uncertainties),
    provenance: {
      origin: guarantees.deterministic ? "phase-12" : "unknown",
      version: "12",
    },
  }));
}

function buildConsensus(
  synthesis: ReasoningSynthesis,
  assessments: ReasoningSynthesis["provenance"]["assessments"]
): SynthesisConsensusEntry[] {
  const topicPositions = new Map<
    string,
    { position: string; personas: Set<string> }
  >();

  assessments.forEach((assessment) => {
    assessment.findings.forEach((finding) => {
      const topic = finding.topic || finding.id || finding.summary;
      const position = normalizePosition(topic, finding.summary, finding.judgment);
      const key = `${topic}:${position}`;
      const entry = topicPositions.get(key);
      if (entry) {
        entry.personas.add(assessment.persona);
      } else {
        topicPositions.set(key, { position, personas: new Set([assessment.persona]) });
      }
    });
  });

  const consensus: SynthesisConsensusEntry[] = [];
  topicPositions.forEach((value, key) => {
    const personasForTopic = Array.from(value.personas);
    const topic = key.split(":")[0] || "unspecified";
    if (personasForTopic.length > 1) {
      consensus.push({
        topic,
        position: value.position,
        personas: personasForTopic.sort(),
      });
    }
  });

  return consensus.sort((a, b) => a.topic.localeCompare(b.topic));
}

function buildDisagreements(synthesis: ReasoningSynthesis): SynthesisDisagreementEntry[] {
  return synthesis.disagreements.map((entry) => ({
    topic: entry.topic,
    positions: entry.positions.map((position) => ({
      persona_id: position.persona,
      position: normalizePosition(entry.topic, position.finding.summary, position.finding.judgment),
    })),
  }));
}

function buildGuarantees(): GuaranteesSection {
  return {
    deterministic: true,
    replayable: true,
    non_agency: true,
    disclaimers: [
      "Artifact encodes reasoning only; no actions or interventions are produced.",
      "Artifact does not guarantee correctness or completeness.",
      "Artifact does not imply real-world outcomes.",
    ],
  };
}

function buildVerification(replay_seed: string): VerificationHooks {
  return {
    hash_algorithm: "sha256",
    replay_seed,
    steps: [
      "Recompute deterministic hash of artifact body (excluding artifact_id).",
      "Compare recomputed hash to artifact_id for integrity.",
      "Validate governance snapshot hashes against expected registry and evolution digests.",
      "Validate deployment fingerprint hash, environment, and governance binding.",
      "Confirm replay_seed matches observed replay inputs.",
    ],
  };
}

export function buildReasoningArtifact(options: BuildReasoningArtifactOptions): ReasoningArtifact {
  const externalAdapterUsage = [...(options.externalAdapterUsage ?? [])].sort();
  // Access external_adapters - it's a required field in ArtifactProvenance interface (line 45 in types.ts)
  // Using type assertion as TypeScript seems to have a type resolution issue
  const externalAdapters = (options.provenance as ArtifactProvenance & { external_adapters: ExternalAdapterPolicy }).external_adapters;
  assertExternalAdapterPolicy(externalAdapters, externalAdapterUsage);
  verifyDeploymentFingerprint(options.provenance.deployment);

  const expectedGovernanceSnapshotHash = deterministicHash(options.provenance.governance);
  if (options.provenance.deployment.governance_snapshot_hash !== expectedGovernanceSnapshotHash) {
    throw new Error("Deployment fingerprint governance snapshot hash mismatch");
  }
  if (options.provenance.deployment.genome_hash !== options.provenance.genome_hash) {
    throw new Error("Deployment fingerprint genome hash mismatch");
  }

  const guarantees = buildGuarantees();
  const personaArtifacts = buildPersonaArtifacts(options, guarantees);
  const consensus = buildConsensus(options.synthesis, options.synthesis.provenance.assessments);
  const disagreements = buildDisagreements(options.synthesis);
  const uncertainties =
    options.synthesis.uncertainties.length > 0
      ? options.synthesis.uncertainties
      : [{ id: "synthesis-uncertainty", topic: "coverage", description: "Uncertainty required", signals: [], severity: "low" as const }];

  const identityBase: ReasoningArtifactIdentity = {
    artifact_version: "reasoning-artifact/v1",
    artifact_id: "",
    logical_time: options.logical_time,
    wall_time: options.wall_time,
  };

  const artifact: ReasoningArtifact = {
    identity: identityBase,
    provenance: {
      ...options.provenance,
      external_adapter_usage: externalAdapterUsage,
    } as ArtifactProvenance,
    inputs: options.inputs,
    personas: personaArtifacts,
    synthesis: {
      consensus,
      disagreements,
      uncertainties,
    },
    guarantees,
    verification: buildVerification(options.replay_seed),
    human: options.human,
  };

  const artifactId = deterministicHash({ ...artifact, identity: { ...artifact.identity, artifact_id: "" } });
  return {
    ...artifact,
    identity: {
      ...artifact.identity,
      artifact_id: artifactId,
    },
  };
}
