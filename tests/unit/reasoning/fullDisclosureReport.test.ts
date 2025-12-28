import { describe, expect, it } from "vitest";
import {
  buildDeploymentFingerprint,
  buildFullDisclosureAuditReport,
  buildReasoningArtifact,
  deterministicHash,
  DEFAULT_EXTERNAL_ADAPTER_POLICY,
  verifyFullDisclosureAuditReport,
} from "@/reasoning/artifacts";
import { ReasoningSynthesis } from "@/reasoning/orchestration";

const synthesis: ReasoningSynthesis = {
  question: "What is the booking risk posture?",
  consensus: [],
  disagreements: [
    {
      id: "risk",
      topic: "risk",
      positions: [
        {
          persona: "alpha",
          finding: {
            id: "alpha-risk",
            topic: "risk",
            summary: "risk elevated",
            judgment: "risk",
            signals: ["p95"],
            assumptions: [],
            confidence: 0.5,
          },
        },
        {
          persona: "beta",
          finding: {
            id: "beta-risk",
            topic: "risk",
            summary: "risk contained",
            judgment: "observation",
            signals: ["p95"],
            assumptions: [],
            confidence: 0.4,
          },
        },
      ],
      signals: ["p95"],
      assumptions: [],
    },
  ],
  uncertainties: [
    { id: "coverage-gap", topic: "coverage", description: "weekend missing", signals: [], severity: "low" },
  ],
  confidence: 0.5,
  notes: [],
  provenance: {
    assessments: [
      {
        persona: "alpha",
        scope: "alpha",
        findings: [
          {
            id: "alpha-risk",
            topic: "risk",
            summary: "risk elevated",
            judgment: "risk",
            signals: ["p95"],
            assumptions: [],
            confidence: 0.5,
          },
        ],
        uncertainties: [{ id: "alpha-uncertainty", topic: "coverage", description: "signal gap", signals: [], severity: "low" }],
        assumptions: [],
        signals: [],
        governance: { permittedDomains: ["booking"], blockedDomains: [] },
        confidence: 0.5,
        reasoningTrace: [],
      },
      {
        persona: "beta",
        scope: "beta",
        findings: [
          {
            id: "beta-risk",
            topic: "risk",
            summary: "risk contained",
            judgment: "observation",
            signals: ["p95"],
            assumptions: [],
            confidence: 0.4,
          },
        ],
        uncertainties: [],
        assumptions: [],
        signals: [],
        governance: { permittedDomains: ["booking"], blockedDomains: [] },
        confidence: 0.4,
        reasoningTrace: [],
      },
    ],
    governance: { domains: ["booking"], blockedDomains: [], deprecatedDomains: [], registryVersion: "v1" },
  },
};

const governanceSnapshots = {
  registry_hash: "registry-a",
  evolution_hash: "evolution-a",
};

const fingerprint = buildDeploymentFingerprint({
  environment: { classification: "staging", label: "staging-a" },
  git_commit: "commit-report-1",
  build_id: "build-report-1",
  artifact_schema_versions: { "reasoning-artifact": "v1" },
  governance_snapshot_hash: deterministicHash(governanceSnapshots),
  reasoning_relevant_config_hashes: [
    { name: "reasoning.timeout.ms", hash: "150" },
    { name: "reasoning.parallelism", hash: "3" },
  ],
});

const provenance = {
  system: "bookiji",
  system_version: "1.1.0",
  phase: "12" as const,
  governance: governanceSnapshots,
  deployment: fingerprint,
  external_adapters: DEFAULT_EXTERNAL_ADAPTER_POLICY,
  external_adapter_usage: [],
};

const inputs = {
  analytics: "digest-analytics",
  audit: "digest-audit",
};

const personaInputs = {
  alpha: inputs.analytics,
  beta: inputs.analytics,
};

function buildArtifact(): ReturnType<typeof buildReasoningArtifact> {
  return buildReasoningArtifact({
    synthesis,
    inputs,
    provenance,
    logical_time: 1,
    replay_seed: "seed-report",
    personaInputs,
  });
}

describe("FullDisclosureAuditReport", () => {
  it("binds artifacts to the deployment fingerprint", () => {
    const artifact = buildArtifact();
    const report = buildFullDisclosureAuditReport({
      bookiji_version: "1.1.0",
      active_phases: ["11.5", "12"],
      artifacts: [artifact],
      deployment: fingerprint,
      issued_at: 1700000000000,
    });

    expect(report.deployment_disclosure.fingerprint.fingerprint_id).toBe(fingerprint.fingerprint_id);
    expect(report.reasoning_evidence.artifacts.every((entry) => entry.deployment.fingerprint_id === fingerprint.fingerprint_id)).toBe(
      true
    );
  });

  it("closes inputs with deterministic hash closure", () => {
    const artifact = buildArtifact();
    const report = buildFullDisclosureAuditReport({
      bookiji_version: "1.1.0",
      active_phases: ["12"],
      artifacts: [artifact],
      deployment: fingerprint,
      issued_at: 1700000000001,
    });

    const expectedHash = deterministicHash({
      inputs: [
        {
          artifact_id: artifact.identity.artifact_id,
          digests: inputs,
        },
      ],
    });

    expect(report.input_closure.hash_closure).toBe(expectedHash);
  });

  it("fails verification when tampered", () => {
    const artifact = buildArtifact();
    const report = buildFullDisclosureAuditReport({
      bookiji_version: "1.1.0",
      active_phases: ["12"],
      artifacts: [artifact],
      deployment: fingerprint,
      issued_at: 1700000000002,
    });

    const tampered = {
      ...report,
      reasoning_evidence: {
        ...report.reasoning_evidence,
        preserved_disagreements: [],
      },
    };

    expect(() => verifyFullDisclosureAuditReport(tampered as any)).toThrow(/hash mismatch|Disagreements/i);
  });

  it("discloses limits explicitly", () => {
    const artifact = buildArtifact();
    const report = buildFullDisclosureAuditReport({
      bookiji_version: "1.1.0",
      active_phases: ["12"],
      artifacts: [artifact],
      deployment: fingerprint,
      issued_at: 1700000000003,
    });

    expect(report.limits.non_claims.some((claim) => claim.toLowerCase().includes("correctness"))).toBe(true);
    expect(report.limits.blind_spots.length).toBeGreaterThan(0);
    expect(report.limits.irreducible_uncertainty.length).toBeGreaterThan(0);
  });
});
