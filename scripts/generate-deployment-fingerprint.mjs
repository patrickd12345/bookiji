#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const entries = Object.entries(value)
    .map(([k, v]) => [k, v])
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

function deterministicHash(value) {
  const hasher = crypto.createHash("sha256");
  hasher.update(stableStringify(value));
  return hasher.digest("hex");
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    if (!value) continue;
    if (key === "--output") options.output = value;
  }
  return options;
}

function sanitizeConfigHashes(configs) {
  return (configs ?? [])
    .map((entry) => ({
      name: entry.name,
      hash: entry.secret ? "redacted" : entry.hash,
      secret: Boolean(entry.secret),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildFingerprint({
  environment,
  git_commit,
  build_id,
  artifact_schema_versions,
  governance_snapshot_hash,
  reasoning_relevant_config_hashes,
}) {
  const artifactSchemas = Object.entries(artifact_schema_versions)
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((acc, [key, val]) => {
      acc[key] = val;
      return acc;
    }, {});

  if (environment.classification === "explicit" && !environment.label) {
    throw new Error("Explicit environments require a label");
  }

  const base = {
    fingerprint_version: "deployment-fingerprint/v1",
    fingerprint_id: "",
    environment,
    git_commit,
    build_id,
    artifact_schema_versions: artifactSchemas,
    governance_snapshot_hash,
    reasoning_relevant_config_hashes: sanitizeConfigHashes(reasoning_relevant_config_hashes),
  };

  const fingerprint_id = deterministicHash({ ...base, fingerprint_id: "" });
  return { ...base, fingerprint_id };
}

function main() {
  const args = parseArgs();
  const output = args.output || path.join("deploy-metadata", "deployment-fingerprint.json");
  const deployEnv = process.env.DEPLOY_ENV ?? "dev";
  const deployEnvLabel = process.env.DEPLOY_ENV_LABEL;
  const governance_snapshot_hash =
    process.env.GOVERNANCE_SNAPSHOT_HASH ??
    deterministicHash({
      registry_hash: process.env.GOVERNANCE_REGISTRY_HASH ?? "registry-unknown",
      evolution_hash: process.env.GOVERNANCE_EVOLUTION_HASH ?? "evolution-unknown",
    });

  const artifactSchemas = process.env.ARTIFACT_SCHEMA_VERSIONS
    ? JSON.parse(process.env.ARTIFACT_SCHEMA_VERSIONS)
    : { "reasoning-artifact": "v1" };

  const configHashes = process.env.REASONING_CONFIG_HASHES ? JSON.parse(process.env.REASONING_CONFIG_HASHES) : [];

  const classification =
    deployEnv === "prod" ? "prod" : deployEnv === "staging" ? "staging" : deployEnv === "dev" ? "dev" : "explicit";

  const fingerprint = buildFingerprint({
    environment: { classification, label: deployEnvLabel },
    git_commit: process.env.GIT_COMMIT ?? process.env.GITHUB_SHA ?? "unknown",
    build_id: process.env.BUILD_ID ?? process.env.GITHUB_RUN_ID ?? undefined,
    artifact_schema_versions: artifactSchemas,
    governance_snapshot_hash,
    reasoning_relevant_config_hashes: configHashes,
  });

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(fingerprint, null, 2));
  console.log(`deployment fingerprint id: ${fingerprint.fingerprint_id}`);
  console.log(`deployment fingerprint saved to ${output}`);
}

main();
