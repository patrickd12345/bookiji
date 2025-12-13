import { deterministicHash } from "./hash";
import { DeploymentFingerprint } from "./deploymentFingerprint";
import { verifyReasoningArtifact } from "./verifyArtifact";
import type { ArtifactInputsDigests, GovernanceSnapshots, ReasoningArtifact } from "./types";

export interface ArtifactEvidence {
  readonly artifact: ReasoningArtifact;
  readonly artifact_hash: string;
  readonly governance: GovernanceSnapshots;
  readonly deployment: DeploymentFingerprint;
}

export interface InputClosureEntry {
  readonly artifact_id: string;
  readonly digests: ArtifactInputsDigests;
}

export interface FullDisclosureLimits {
  readonly non_claims: readonly string[];
  readonly blind_spots: readonly string[];
  readonly irreducible_uncertainty: readonly string[];
}

export interface FullDisclosureAuditReport {
  readonly report_version: "full-disclosure-audit/v1";
  readonly report_id: string;
  readonly issued_at: number;
  readonly machine_generated: true;
  readonly system_posture: {
    readonly bookiji_version: string;
    readonly active_phases: readonly string[];
    readonly non_capabilities: readonly string[];
    readonly invariants: readonly string[];
  };
  readonly reasoning_evidence: {
    readonly artifacts: readonly ArtifactEvidence[];
    readonly preserved_disagreements: readonly string[];
    readonly preserved_uncertainties: readonly string[];
  };
  readonly input_closure: {
    readonly inputs: readonly InputClosureEntry[];
    readonly closed_world: string;
    readonly hash_closure: string;
  };
  readonly deployment_disclosure: {
    readonly fingerprint: DeploymentFingerprint;
    readonly environment: DeploymentFingerprint["environment"];
    readonly config_hashes: DeploymentFingerprint["reasoning_relevant_config_hashes"];
    readonly determinism: readonly string[];
  };
  readonly limits: FullDisclosureLimits;
  readonly verification: {
    readonly instructions: readonly string[];
    readonly invalid_conditions: readonly string[];
  };
}

export interface BuildFullDisclosureAuditReportOptions {
  readonly bookiji_version: string;
  readonly active_phases: readonly string[];
  readonly artifacts: readonly ReasoningArtifact[];
  readonly deployment: DeploymentFingerprint;
  readonly invariants?: readonly string[];
  readonly non_capabilities?: readonly string[];
  readonly limits?: Partial<FullDisclosureLimits>;
  readonly issued_at?: number;
}

export interface FullDisclosureVerificationContext {
  readonly expected_deployment_fingerprint_id?: string;
}

function buildEvidence(artifacts: readonly ReasoningArtifact[], deployment: DeploymentFingerprint): ArtifactEvidence[] {
  return artifacts.map((artifact) => {
    if (artifact.provenance.deployment.fingerprint_id !== deployment.fingerprint_id) {
      throw new Error("Artifact is not bound to the declared deployment fingerprint");
    }

    verifyReasoningArtifact(artifact, {
      deployment_fingerprint_id: deployment.fingerprint_id,
      environment: deployment.environment.classification,
      registry_hash: artifact.provenance.governance.registry_hash,
      evolution_hash: artifact.provenance.governance.evolution_hash,
      genome_hash: artifact.provenance.genome_hash,
    });

    return {
      artifact,
      artifact_hash: artifact.identity.artifact_id,
      governance: artifact.provenance.governance,
      deployment: artifact.provenance.deployment,
    };
  });
}

function buildInputClosure(artifacts: readonly ReasoningArtifact[]): { inputs: InputClosureEntry[]; hash: string } {
  const inputs = artifacts
    .map((artifact) => ({
      artifact_id: artifact.identity.artifact_id,
      digests: artifact.inputs,
    }))
    .sort((a, b) => a.artifact_id.localeCompare(b.artifact_id));

  return { inputs, hash: deterministicHash({ inputs }) };
}

function collectDisagreements(artifacts: readonly ReasoningArtifact[]): string[] {
  const disagreements = artifacts.flatMap((artifact) =>
    artifact.synthesis.disagreements.map((entry) => `${artifact.identity.artifact_id}:${entry.topic}`)
  );
  return Array.from(new Set(disagreements)).sort();
}

function collectUncertainties(artifacts: readonly ReasoningArtifact[]): string[] {
  const uncertainties = artifacts.flatMap((artifact) =>
    artifact.synthesis.uncertainties.map((entry) => `${artifact.identity.artifact_id}:${entry.id}`)
  );
  return Array.from(new Set(uncertainties)).sort();
}

function buildLimits(uncertainties: readonly string[], overrides?: Partial<FullDisclosureLimits>): FullDisclosureLimits {
  const base: FullDisclosureLimits = {
    non_claims: [
      "No claim of correctness or truth of the reasoning.",
      "No claim of completeness of inputs or scenarios.",
      "No promise of outcomes, interventions, or actions.",
    ],
    blind_spots: [
      "Inputs not listed in the closure digests are excluded.",
      "Post-deployment drift beyond the fingerprint is not captured.",
    ],
    irreducible_uncertainty: uncertainties.length ? uncertainties : ["uncertainty:unspecified"],
  };

  const limits: FullDisclosureLimits = {
    non_claims: overrides?.non_claims ?? base.non_claims,
    blind_spots: overrides?.blind_spots ?? base.blind_spots,
    irreducible_uncertainty: overrides?.irreducible_uncertainty ?? base.irreducible_uncertainty,
  };

  if (!limits.non_claims.length || !limits.blind_spots.length || !limits.irreducible_uncertainty.length) {
    throw new Error("Limits must be explicitly disclosed");
  }

  return limits;
}

export function buildFullDisclosureAuditReport(options: BuildFullDisclosureAuditReportOptions): FullDisclosureAuditReport {
  if (!options.artifacts.length) {
    throw new Error("At least one reasoning artifact is required for audit projection");
  }

  const evidence = buildEvidence(options.artifacts, options.deployment);
  const disagreements = collectDisagreements(options.artifacts);
  const uncertainties = collectUncertainties(options.artifacts);
  const inputClosure = buildInputClosure(options.artifacts);
  const limits = buildLimits(uncertainties, options.limits);
  const issued_at = options.issued_at ?? Date.now();

  const reportBase: FullDisclosureAuditReport = {
    report_version: "full-disclosure-audit/v1",
    report_id: "",
    issued_at,
    machine_generated: true,
    system_posture: {
      bookiji_version: options.bookiji_version,
      active_phases: options.active_phases,
      non_capabilities: options.non_capabilities ?? ["no_agency", "no_intervention", "no_autonomy"],
      invariants:
        options.invariants ??
        [
          "Deterministic, hash-closed reasoning artifacts.",
          "Governance-bound provenance with preserved disagreement.",
          "Deployment fingerprint binding with hash integrity.",
          "Mandatory uncertainty disclosure.",
        ],
    },
    reasoning_evidence: {
      artifacts: evidence,
      preserved_disagreements: disagreements,
      preserved_uncertainties: uncertainties,
    },
    input_closure: {
      inputs: inputClosure.inputs,
      closed_world: "Only listed digests were used as inputs; absence implies exclusion.",
      hash_closure: inputClosure.hash,
    },
    deployment_disclosure: {
      fingerprint: options.deployment,
      environment: options.deployment.environment,
      config_hashes: options.deployment.reasoning_relevant_config_hashes,
      determinism: [
        "Deployment fingerprint is deterministic and independent of secrets.",
        "All artifacts reference the same fingerprint_id.",
        "Config allowlist is hashable and order-insensitive.",
        "Input closure hashing is deterministic regardless of artifact ordering or scale.",
      ],
    },
    limits,
    verification: {
      instructions: [
        "Recompute report_id with report_id set to an empty string.",
        "Recompute input_closure.hash_closure from listed inputs.",
        "Recompute deployment fingerprint hash and compare to fingerprint_id.",
        "Verify each artifact via verifyReasoningArtifact using the declared deployment fingerprint and environment.",
        "Validate governance snapshot hash and genome hash bindings for each artifact.",
      ],
      invalid_conditions: [
        "Any hash recomputation mismatch.",
        "Artifacts bound to a different deployment fingerprint.",
        "Missing disagreement or uncertainty relative to embedded artifacts.",
        "Environment classification mismatch during verification.",
      ],
    },
  };

  const report_id = deterministicHash({ ...reportBase, report_id: "" });
  return { ...reportBase, report_id };
}

export function verifyFullDisclosureAuditReport(
  report: FullDisclosureAuditReport,
  context: FullDisclosureVerificationContext = {}
): void {
  if (report.report_version !== "full-disclosure-audit/v1") {
    throw new Error("Unsupported audit report version");
  }

  const recalculated = deterministicHash({ ...report, report_id: "" });
  if (recalculated !== report.report_id) {
    throw new Error("Audit report hash mismatch");
  }

  const expectedFingerprintId =
    context.expected_deployment_fingerprint_id ?? report.deployment_disclosure.fingerprint.fingerprint_id;
  if (report.deployment_disclosure.fingerprint.fingerprint_id !== expectedFingerprintId) {
    throw new Error("Deployment fingerprint in report does not match expected value");
  }

  const closureHash = deterministicHash({ inputs: report.input_closure.inputs });
  if (closureHash !== report.input_closure.hash_closure) {
    throw new Error("Input closure hash mismatch");
  }

  const expectedDisagreements = collectDisagreements(report.reasoning_evidence.artifacts.map((entry) => entry.artifact));
  const expectedUncertainties = collectUncertainties(report.reasoning_evidence.artifacts.map((entry) => entry.artifact));

  expectedDisagreements.forEach((topic) => {
    if (!report.reasoning_evidence.preserved_disagreements.includes(topic)) {
      throw new Error("Disagreements were omitted from the audit report");
    }
  });
  expectedUncertainties.forEach((uncertainty) => {
    if (!report.reasoning_evidence.preserved_uncertainties.includes(uncertainty)) {
      throw new Error("Uncertainty was omitted from the audit report");
    }
  });

  if (
    !report.limits.non_claims.length ||
    !report.limits.blind_spots.length ||
    !report.limits.irreducible_uncertainty.length
  ) {
    throw new Error("Audit limits are incomplete");
  }

  report.reasoning_evidence.artifacts.forEach((entry) => {
    if (entry.artifact_hash !== entry.artifact.identity.artifact_id) {
      throw new Error("Artifact hash entry does not match artifact identity");
    }

    if (entry.deployment.fingerprint_id !== expectedFingerprintId) {
      throw new Error("Artifact evidence is not bound to the declared deployment fingerprint");
    }

    verifyReasoningArtifact(entry.artifact, {
      deployment_fingerprint_id: expectedFingerprintId,
      environment: report.deployment_disclosure.environment.classification,
      registry_hash: entry.governance.registry_hash,
      evolution_hash: entry.governance.evolution_hash,
      genome_hash: entry.artifact.provenance.genome_hash,
    });
  });
}
