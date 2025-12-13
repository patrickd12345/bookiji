import { DomainValidationResult, GenomeSpec, RepoContext } from "./loadGenome";
import { resolveRepoPath, safeExists } from "./utils";

export async function validateOpsAI(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const DOMAIN = "OPS AI";

  (genome.domains.opsai.services ?? []).forEach((service) => {
    const servicePath = resolveRepoPath(context.repoRoot, service.folder);
    if (!safeExists(servicePath)) {
      errors.push(`${DOMAIN}: Missing required service folder for "${service.id}" (expected at ${servicePath})`);
    }
  });

  (genome.domains.opsai.diagnostics?.smokeTests ?? []).forEach((script) => {
    const scriptPath = resolveRepoPath(context.repoRoot, script);
    if (!safeExists(scriptPath)) {
      warnings.push(`${DOMAIN}: Optional smoke test script not found: ${scriptPath}`);
    }
  });

  const contractFiles = [
    "src/contracts/analytics/AnalyticsEnvelope.ts",
    "src/contracts/analytics/StandardizedEvent.ts",
    "src/contracts/analytics/Timebase.ts",
    "src/opsai/contracts/OpsAIEventContract.ts",
    "src/opsai/contracts/OpsAIEnvelopeAdapter.ts",
    "src/opsai/v2/types.ts",
    "src/opsai/v2/reasoner.ts",
    "src/opsai/v2/governance.ts",
    "src/opsai/v2/index.ts",
  ];

  contractFiles.forEach((relativePath) => {
    const contractPath = resolveRepoPath(context.repoRoot, relativePath);
    if (!safeExists(contractPath)) {
      errors.push(`${DOMAIN}: Missing contract artifact at ${relativePath} (expected at ${contractPath})`);
    }
  });

  return { domain: "opsai", errors, warnings };
}
