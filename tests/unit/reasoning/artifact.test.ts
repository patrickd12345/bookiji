import { describe, expect, it } from "vitest";
import {
  buildDeploymentFingerprint,
  buildReasoningArtifact,
  deterministicHash,
  DEFAULT_EXTERNAL_ADAPTER_POLICY,
  verifyReasoningArtifact,
} from "@/reasoning/artifacts";
import { ReasoningSynthesis } from "@/reasoning/orchestration";

const baseSynthesis: ReasoningSynthesis = {
  question: "Is latency stable?",
  consensus: [],
  disagreements: [
    {
      id: "latency",
      topic: "latency",
      positions: [
        {
          persona: "reliability",
          finding: {
            id: "rel-lat",
            topic: "latency",
            summary: "latency increasing",
            judgment: "risk",
            signals: ["p95"],
            assumptions: [],
            confidence: 0.6,
          },
        },
        {
          persona: "governance",
          finding: {
            id: "gov-lat",
            topic: "latency",
            summary: "latency acceptable",
            judgment: "observation",
            signals: ["p95"],
            assumptions: [],
            confidence: 0.6,
          },
        },
      ],
      signals: ["p95"],
      assumptions: [],
    },
  ],
  uncertainties: [
    {
      id: "coverage-gap",
      topic: "coverage",
      description: "missing weekend data",
      signals: [],
      severity: "medium",
    },
  ],
  confidence: 0.5,
  notes: [],
  provenance: {
    assessments: [
      {
        persona: "reliability",
        scope: "reliability",
        findings: [
          {
            id: "rel-lat",
            topic: "latency",
            summary: "latency increasing",
            judgment: "risk",
            signals: ["p95"],
            assumptions: [],
            confidence: 0.6,
          },
        ],
        uncertainties: [
          {
            id: "rel-uncertainty",
            topic: "latency",
            description: "p95 window limited",
            signals: ["p95"],
            severity: "low",
          },
        ],
        assumptions: [],
        signals: [],
        governance: { permittedDomains: ["booking"], blockedDomains: [] },
        confidence: 0.6,
        reasoningTrace: [],
      },
      {
        persona: "governance",
        scope: "governance",
        findings: [
          {
            id: "gov-lat",
            topic: "latency",
            summary: "latency acceptable",
            judgment: "observation",
            signals: ["p95"],
            assumptions: [],
            confidence: 0.6,
          },
        ],
        uncertainties: [],
        assumptions: [],
        signals: [],
        governance: { permittedDomains: ["booking"], blockedDomains: [] },
        confidence: 0.6,
        reasoningTrace: [],
      },
    ],
    governance: {
      domains: ["booking"],
      blockedDomains: [],
      deprecatedDomains: [],
      registryVersion: "v1",
    },
  },
};

const baseInputs = {
  analytics: "digest-analytics",
  simcity: "digest-simcity",
  audit: "digest-audit",
  trust: "digest-trust",
};

const governance = {
  registry_hash: "registry-hash",
  evolution_hash: "evolution-hash",
};

const fingerprint = buildDeploymentFingerprint({
  environment: { classification: "staging", label: "staging-blue" },
  git_commit: "commit-123",
  build_id: "build-456",
  artifact_schema_versions: { "reasoning-artifact": "v1" },
  governance_snapshot_hash: deterministicHash(governance),
  reasoning_relevant_config_hashes: [
    { name: "reasoning.timeout.ms", hash: "100" },
    { name: "reasoning.parallelism", hash: "2" },
  ],
});

const provenance = {
  system: "bookiji",
  system_version: "1.0.0",
  phase: "12" as const,
  governance,
  deployment: fingerprint,
  external_adapters: DEFAULT_EXTERNAL_ADAPTER_POLICY,
  external_adapter_usage: [],
};

const personaInputs = {
  reliability: "digest-analytics",
  governance: "digest-governance",
};

describe("ReasoningArtifact", () => {
  it("produces deterministic artifact_id for identical inputs", () => {
    const artifactA = buildReasoningArtifact({
      synthesis: baseSynthesis,
      inputs: baseInputs,
      provenance,
      logical_time: 10,
      replay_seed: "seed-1",
      personaInputs,
    });

    const artifactB = buildReasoningArtifact({
      synthesis: baseSynthesis,
      inputs: baseInputs,
      provenance,
      logical_time: 10,
      replay_seed: "seed-1",
      personaInputs,
    });

    expect(artifactA.identity.artifact_id).toBe(artifactB.identity.artifact_id);
  });

  it("remains deterministic under provenance property reordering", () => {
    const scrambledProvenance = {
      phase: "12" as const,
      governance: provenance.governance,
      system_version: provenance.system_version,
      system: provenance.system,
      deployment: provenance.deployment,
      external_adapters: provenance.external_adapters,
      external_adapter_usage: provenance.external_adapter_usage,
    };

    const artifact = buildReasoningArtifact({
      synthesis: baseSynthesis,
      inputs: baseInputs,
      provenance,
      logical_time: 20,
      replay_seed: "seed-2",
      personaInputs,
    });

    const recomputed = buildReasoningArtifact({
      synthesis: baseSynthesis,
      inputs: baseInputs,
      provenance: scrambledProvenance,
      logical_time: 20,
      replay_seed: "seed-2",
      personaInputs,
    });

    expect(artifact.identity.artifact_id).toBe(recomputed.identity.artifact_id);
  });

  it("fails verification when governance snapshots mismatch", () => {
    const artifact = buildReasoningArtifact({
      synthesis: baseSynthesis,
      inputs: baseInputs,
      provenance,
      logical_time: 30,
      replay_seed: "seed-3",
      personaInputs,
    });

    expect(() =>
      verifyReasoningArtifact(artifact, {
        registry_hash: "unexpected",
      })
    ).toThrow(/registry hash mismatch/);
  });

  it("fails verification when deployment fingerprint does not match expectation", () => {
    const artifact = buildReasoningArtifact({
      synthesis: baseSynthesis,
      inputs: baseInputs,
      provenance,
      logical_time: 32,
      replay_seed: "seed-3b",
      personaInputs,
    });

    const mismatchedFingerprint = buildDeploymentFingerprint({
      environment: provenance.deployment.environment,
      git_commit: "commit-different",
      build_id: provenance.deployment.build_id,
      artifact_schema_versions: { ...provenance.deployment.artifact_schema_versions },
      governance_snapshot_hash: provenance.deployment.governance_snapshot_hash,
      reasoning_relevant_config_hashes: provenance.deployment.reasoning_relevant_config_hashes,
    });

    expect(() =>
      verifyReasoningArtifact(artifact, { deployment_fingerprint_id: mismatchedFingerprint.fingerprint_id })
    ).toThrow(/deployment fingerprint/i);
  });

  it("detects deployment environment mismatches", () => {
    const artifact = buildReasoningArtifact({
      synthesis: baseSynthesis,
      inputs: baseInputs,
      provenance,
      logical_time: 34,
      replay_seed: "seed-3c",
      personaInputs,
    });

    expect(() => verifyReasoningArtifact(artifact, { environment: "prod" })).toThrow(/environment mismatch/);
  });

  it("rejects artifacts built from external orchestration adapters", () => {
    expect(() =>
      buildReasoningArtifact({
        synthesis: baseSynthesis,
        inputs: baseInputs,
        provenance,
        logical_time: 35,
        replay_seed: "seed-3c",
        personaInputs,
        externalAdapterUsage: ["langchain"],
      })
    ).toThrow(/External adapters are non-authoritative/i);
  });

  it("invalidates artifacts with tampered deployment fingerprints", () => {
    const artifact = buildReasoningArtifact({
      synthesis: baseSynthesis,
      inputs: baseInputs,
      provenance,
      logical_time: 36,
      replay_seed: "seed-3d",
      personaInputs,
    });

    const tampered = {
      ...artifact,
      provenance: {
        ...artifact.provenance,
        deployment: { ...artifact.provenance.deployment, fingerprint_id: "corrupted" },
        external_adapter_usage: ["n8n"],
      },
    };

    expect(() => verifyReasoningArtifact(tampered as any)).toThrow(/artifact hash|fingerprint|adapter/i);
  });

  it("preserves disagreements without collapsing positions", () => {
    const artifact = buildReasoningArtifact({
      synthesis: baseSynthesis,
      inputs: baseInputs,
      provenance,
      logical_time: 40,
      replay_seed: "seed-4",
      personaInputs,
    });

    const disagreement = artifact.synthesis.disagreements.find((entry) => entry.topic === "latency");
    expect(disagreement).toBeDefined();
    expect(disagreement?.positions.length).toBeGreaterThan(1);
    const unique = new Set(disagreement?.positions.map((p) => p.position));
    expect(unique.size).toBeGreaterThan(1);
  });

  it("always retains uncertainty information", () => {
    const artifact = buildReasoningArtifact({
      synthesis: baseSynthesis,
      inputs: baseInputs,
      provenance,
      logical_time: 50,
      replay_seed: "seed-5",
      personaInputs,
    });

    expect(artifact.synthesis.uncertainties.length).toBeGreaterThan(0);
  });
});
