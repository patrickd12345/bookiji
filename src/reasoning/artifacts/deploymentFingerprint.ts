import { deterministicHash } from "./hash";

export type DeploymentEnvironmentClassification = "dev" | "staging" | "prod" | "explicit";

export interface DeploymentEnvironment {
  readonly classification: DeploymentEnvironmentClassification;
  readonly label?: string;
}

export interface ReasoningConfigHash {
  readonly name: string;
  readonly hash: string;
  readonly secret?: boolean;
}

export interface DeploymentFingerprint {
  readonly fingerprint_version: "deployment-fingerprint/v1";
  readonly fingerprint_id: string;
  readonly environment: DeploymentEnvironment;
  readonly git_commit: string;
  readonly build_id?: string;
  readonly artifact_schema_versions: Readonly<Record<string, string>>;
  readonly governance_snapshot_hash: string;
  readonly reasoning_relevant_config_hashes: readonly ReasoningConfigHash[];
}

export interface BuildDeploymentFingerprintOptions {
  readonly environment: DeploymentEnvironment;
  readonly git_commit: string;
  readonly build_id?: string;
  readonly artifact_schema_versions: Record<string, string>;
  readonly governance_snapshot_hash: string;
  readonly reasoning_relevant_config_hashes?: readonly ReasoningConfigHash[];
}

export interface DeploymentVerificationContext {
  readonly expected_fingerprint_id?: string;
  readonly expected_environment?: DeploymentEnvironmentClassification;
}

function normalizeEnvironment(environment: DeploymentEnvironment): DeploymentEnvironment {
  if (environment.classification === "explicit" && !environment.label) {
    throw new Error("Explicit deployment environments require a label");
  }
  return {
    classification: environment.classification,
    label: environment.label,
  };
}

function normalizeArtifactSchemas(artifact_schema_versions: Record<string, string>): Record<string, string> {
  const entries = Object.entries(artifact_schema_versions).sort(([a], [b]) => a.localeCompare(b));
  return entries.reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
}

function sanitizeConfigHashes(configs: readonly ReasoningConfigHash[] = []): ReasoningConfigHash[] {
  const sanitized = configs.map((config) => ({
    name: config.name,
    hash: config.secret ? "redacted" : config.hash,
    secret: config.secret ?? false,
  }));
  return sanitized.sort((a, b) => a.name.localeCompare(b.name));
}

export function buildDeploymentFingerprint(options: BuildDeploymentFingerprintOptions): DeploymentFingerprint {
  const environment = normalizeEnvironment(options.environment);
  const artifact_schema_versions = normalizeArtifactSchemas(options.artifact_schema_versions);
  const reasoning_relevant_config_hashes = sanitizeConfigHashes(options.reasoning_relevant_config_hashes);

  const fingerprintBase: DeploymentFingerprint = {
    fingerprint_version: "deployment-fingerprint/v1",
    fingerprint_id: "",
    environment,
    git_commit: options.git_commit,
    build_id: options.build_id,
    artifact_schema_versions,
    governance_snapshot_hash: options.governance_snapshot_hash,
    reasoning_relevant_config_hashes,
  };

  const fingerprint_id = deterministicHash({ ...fingerprintBase, fingerprint_id: "" });
  return { ...fingerprintBase, fingerprint_id };
}

export function verifyDeploymentFingerprint(
  fingerprint: DeploymentFingerprint,
  context: DeploymentVerificationContext = {}
): void {
  if (fingerprint.fingerprint_version !== "deployment-fingerprint/v1") {
    throw new Error("Unsupported deployment fingerprint version");
  }

  const recalculated = deterministicHash({ ...fingerprint, fingerprint_id: "" });
  if (recalculated !== fingerprint.fingerprint_id) {
    throw new Error("Deployment fingerprint hash mismatch");
  }

  if (context.expected_fingerprint_id && context.expected_fingerprint_id !== fingerprint.fingerprint_id) {
    throw new Error("Deployment fingerprint does not match expected identity");
  }

  if (context.expected_environment && fingerprint.environment.classification !== context.expected_environment) {
    throw new Error("Deployment environment mismatch");
  }
}
