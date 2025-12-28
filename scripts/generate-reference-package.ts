import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_EXTERNAL_ADAPTER_POLICY,
  buildDeploymentFingerprint,
  buildFullDisclosureAuditReport,
  buildReasoningArtifact,
  deterministicHash,
  type ReasoningArtifact,
  type DeploymentFingerprint,
} from "@/reasoning/artifacts";
import { ReasoningSynthesis } from "@/reasoning/orchestration";

const referenceDir = path.join(process.cwd(), "reference");

function ensureDir() {
  if (!fs.existsSync(referenceDir)) {
    fs.mkdirSync(referenceDir, { recursive: true });
  }
}

function buildReferenceArtifact() {
  const governance = {
    registry_hash: "ref-registry-hash",
    evolution_hash: "ref-evolution-hash",
  };

  const fingerprint = buildDeploymentFingerprint({
    environment: { classification: "explicit", label: "reference-static" },
    git_commit: "reference-commit",
    build_id: "reference-build",
    artifact_schema_versions: { "reasoning-artifact": "v1" },
    governance_snapshot_hash: deterministicHash(governance),
    reasoning_relevant_config_hashes: [
      { name: "reasoning.timeout.ms", hash: "120" },
      { name: "reasoning.parallelism", hash: "1" },
    ],
  });

  const synthesis: ReasoningSynthesis = {
    question: "What is the booking reliability posture for reference purposes?",
    consensus: [],
    disagreements: [
      {
        id: "reliability",
        topic: "reliability",
        positions: [
          {
            persona: "ops",
            finding: {
              id: "ops-reliability",
              topic: "reliability",
              summary: "reference latency risk detected",
              judgment: "risk",
              signals: ["p95"],
              assumptions: [],
              confidence: 0.55,
            },
          },
          {
            persona: "governance",
            finding: {
              id: "gov-reliability",
              topic: "reliability",
              summary: "reference latency acceptable",
              judgment: "observation",
              signals: ["p95"],
              assumptions: [],
              confidence: 0.45,
            },
          },
        ],
        signals: ["p95"],
        assumptions: [],
      },
    ],
    uncertainties: [
      {
        id: "coverage-gap-reference",
        topic: "coverage",
        description: "reference example uncertainty",
        signals: [],
        severity: "low",
      },
    ],
    confidence: 0.5,
    notes: [],
    provenance: {
      assessments: [
        {
          persona: "ops",
          scope: "ops",
          findings: [
            {
              id: "ops-reliability",
              topic: "reliability",
              summary: "reference latency risk detected",
              judgment: "risk",
              signals: ["p95"],
              assumptions: [],
              confidence: 0.55,
            },
          ],
          uncertainties: [
            {
              id: "ops-uncertainty",
              topic: "coverage",
              description: "reference uncertainty record",
              signals: [],
              severity: "low",
            },
          ],
          assumptions: [],
          signals: [],
          governance: { permittedDomains: ["booking"], blockedDomains: [] },
          confidence: 0.55,
          reasoningTrace: [],
        },
        {
          persona: "governance",
          scope: "governance",
          findings: [
            {
              id: "gov-reliability",
              topic: "reliability",
              summary: "reference latency acceptable",
              judgment: "observation",
              signals: ["p95"],
              assumptions: [],
              confidence: 0.45,
            },
          ],
          uncertainties: [],
          assumptions: [],
          signals: [],
          governance: { permittedDomains: ["booking"], blockedDomains: [] },
          confidence: 0.45,
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

  const inputs = {
    analytics: "ref-analytics-digest",
    simcity: "ref-simcity-digest",
    audit: "ref-audit-digest",
    trust: "ref-trust-digest",
  };

  const personaInputs = {
    ops: inputs.analytics,
    governance: inputs.analytics,
  };

  const provenance = {
    system: "bookiji",
    system_version: "1.0.0",
    phase: "12" as const,
    governance,
    deployment: fingerprint,
    external_adapters: DEFAULT_EXTERNAL_ADAPTER_POLICY,
    external_adapter_usage: [],
  };

  const artifact = buildReasoningArtifact({
    synthesis,
    inputs,
    provenance,
    logical_time: 100,
    wall_time: 1700000000000,
    replay_seed: "reference-seed",
    personaInputs,
  });

  return { artifact, fingerprint };
}

function buildReferenceReport(artifact: ReasoningArtifact, fingerprint: DeploymentFingerprint) {
  return buildFullDisclosureAuditReport({
    bookiji_version: "1.0.0",
    active_phases: ["12"],
    artifacts: [artifact],
    deployment: fingerprint,
    issued_at: 1700000001000,
  });
}

function main() {
  ensureDir();
  const { artifact, fingerprint } = buildReferenceArtifact();
  const report = buildReferenceReport(artifact, fingerprint);

  fs.writeFileSync(path.join(referenceDir, "example-reasoning-artifact.json"), JSON.stringify(artifact, null, 2));
  fs.writeFileSync(path.join(referenceDir, "example-full-disclosure-report.json"), JSON.stringify(report, null, 2));
}

main();
