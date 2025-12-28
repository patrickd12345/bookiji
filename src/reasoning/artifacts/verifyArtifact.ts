import { deterministicHash } from "./hash";
import { ReasoningArtifact } from "./types";
import {
  DeploymentEnvironmentClassification,
  DeploymentFingerprint,
  verifyDeploymentFingerprint,
} from "./deploymentFingerprint";
import { assertExternalAdapterPolicy } from "../adapters/policy";

export interface VerificationContext {
  readonly registry_hash?: string;
  readonly evolution_hash?: string;
  readonly deployment_fingerprint_id?: string;
  readonly deployment_fingerprint?: DeploymentFingerprint;
  readonly environment?: DeploymentEnvironmentClassification;
}

export function verifyReasoningArtifact(artifact: ReasoningArtifact, context: VerificationContext = {}): void {
  if (artifact.identity.artifact_version !== "reasoning-artifact/v1") {
    throw new Error("Unsupported reasoning artifact version");
  }

  const recalculated = deterministicHash({
    ...artifact,
    identity: { ...artifact.identity, artifact_id: "" },
  });

  if (recalculated !== artifact.identity.artifact_id) {
    throw new Error("Artifact hash verification failed");
  }

  if (context.registry_hash && artifact.provenance.governance.registry_hash !== context.registry_hash) {
    throw new Error("Governance registry hash mismatch");
  }

  if (context.evolution_hash && artifact.provenance.governance.evolution_hash !== context.evolution_hash) {
    throw new Error("Governance evolution hash mismatch");
  }

  assertExternalAdapterPolicy(artifact.provenance.external_adapters, artifact.provenance.external_adapter_usage ?? []);

  const expectedGovernanceSnapshotHash = deterministicHash(artifact.provenance.governance);
  if (artifact.provenance.deployment.governance_snapshot_hash !== expectedGovernanceSnapshotHash) {
    throw new Error("Deployment fingerprint governance snapshot mismatch");
  }
  verifyDeploymentFingerprint(artifact.provenance.deployment, {
    expected_fingerprint_id:
      context.deployment_fingerprint_id ?? context.deployment_fingerprint?.fingerprint_id ?? undefined,
    expected_environment: context.environment,
  });

  if (!artifact.synthesis.uncertainties.length) {
    throw new Error("Uncertainty section missing");
  }

  artifact.synthesis.disagreements.forEach((entry) => {
    const uniquePositions = new Set(entry.positions.map((position) => position.position));
    if (entry.positions.length <= 1 || uniquePositions.size <= 1) {
      throw new Error(`Disagreement "${entry.topic}" is collapsed or incomplete`);
    }
  });
}
