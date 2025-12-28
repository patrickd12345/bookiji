import { describe, expect, it } from "vitest";
import { buildDeploymentFingerprint, deterministicHash } from "@/reasoning/artifacts";

const governance = {
  registry_hash: "registry-1",
  evolution_hash: "evolution-1",
};

const baseOptions = {
  environment: { classification: "dev" as const },
  git_commit: "commit-abc",
  build_id: "build-123",
  artifact_schema_versions: { "reasoning-artifact": "v1", analytics: "v2" },
  governance_snapshot_hash: deterministicHash(governance),
  reasoning_relevant_config_hashes: [
    { name: "reasoning.timeout.ms", hash: "100" },
    { name: "reasoning.parallelism", hash: "2" },
  ],
};

describe("DeploymentFingerprint", () => {
  it("generates deterministic fingerprint ids for identical inputs", () => {
    const a = buildDeploymentFingerprint(baseOptions);
    const b = buildDeploymentFingerprint(baseOptions);
    expect(a.fingerprint_id).toBe(b.fingerprint_id);
  });

  it("is insensitive to config ordering", () => {
    const ordered = buildDeploymentFingerprint(baseOptions);
    const reversed = buildDeploymentFingerprint({
      ...baseOptions,
      artifact_schema_versions: { analytics: "v2", "reasoning-artifact": "v1" },
      reasoning_relevant_config_hashes: [...baseOptions.reasoning_relevant_config_hashes].reverse(),
    });
    expect(ordered.fingerprint_id).toBe(reversed.fingerprint_id);
  });

  it("does not hash secrets into the fingerprint identity", () => {
    const withSecret = buildDeploymentFingerprint({
      ...baseOptions,
      reasoning_relevant_config_hashes: [
        { name: "reasoning.timeout.ms", hash: "100" },
        { name: "secret.token", hash: "shh-1", secret: true },
      ],
    });
    const withDifferentSecret = buildDeploymentFingerprint({
      ...baseOptions,
      reasoning_relevant_config_hashes: [
        { name: "reasoning.timeout.ms", hash: "100" },
        { name: "secret.token", hash: "shh-2", secret: true },
      ],
    });

    expect(withSecret.fingerprint_id).toBe(withDifferentSecret.fingerprint_id);
    const secretEntry = withSecret.reasoning_relevant_config_hashes.find((item) => item.name === "secret.token");
    expect(secretEntry?.hash).toBe("redacted");
  });
});
