#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import yaml from "js-yaml";

const repoRoot = process.cwd();

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

function hashContent(content) {
  const hasher = crypto.createHash("sha256");
  hasher.update(content);
  return hasher.digest("hex");
}

function readFromRef(ref, filePath) {
  const result = spawnSync("git", ["show", `${ref}:${filePath}`], { encoding: "utf8" });
  if (result.status !== 0) return null;
  return result.stdout;
}

function genomeGate() {
  const genomePath = "genome/master-genome.yaml";
  const absoluteGenomePath = path.join(repoRoot, genomePath);
  if (!fs.existsSync(absoluteGenomePath)) {
    console.warn("[epistemic] genome file missing; skipping genome gate");
    return;
  }

  const baseRef = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "HEAD^";
  const baseContent = readFromRef(baseRef, genomePath);
  if (!baseContent) {
    console.warn(`[epistemic] unable to read ${genomePath} from ${baseRef}; skipping version gate`);
    return;
  }

  const currentContent = fs.readFileSync(absoluteGenomePath, "utf8");
  const baseHash = hashContent(baseContent);
  const currentHash = hashContent(currentContent);

  if (baseHash === currentHash) {
    console.log("[epistemic] genome hash unchanged");
    return;
  }

  const baseVersion = yaml.load(baseContent)?.version;
  const currentVersion = yaml.load(currentContent)?.version;

  if (baseVersion === currentVersion) {
    throw new Error("Genome hash changed without version bump");
  }

  console.log(`[epistemic] genome hash changed with version bump ${baseVersion} -> ${currentVersion}`);
}

function run(command, args, label) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    throw new Error(`${label} failed`);
  }
}

function runDeterminismTests() {
  const tests = [
    "tests/unit/reasoning/deploymentFingerprint.test.ts",
    "tests/unit/reasoning/artifact.test.ts",
    "tests/unit/reasoning/fullDisclosureReport.test.ts",
  ];
  run("npx", ["vitest", "run", ...tests], "Reasoning determinism tests");
}

function regenerateDeploymentFingerprint() {
  const outputPath = path.join("deploy-metadata", "deployment-fingerprint.json");
  run("node", ["scripts/generate-deployment-fingerprint.mjs", "--output", outputPath], "Deployment fingerprint regeneration");
  console.log(`[epistemic] deployment fingerprint regenerated at ${outputPath}`);
}

function runDocIntegrityGate() {
  run("pnpm", ["docs:integrity", "--", "--output", "docs/integrity-report.json"], "Documentation integrity gate");
  console.log("[epistemic] documentation integrity gate passed");
}

function main() {
  genomeGate();
  runDocIntegrityGate();
  runDeterminismTests();
  regenerateDeploymentFingerprint();
  console.log("[epistemic] all gates passed");
}

main();
