import { DomainValidationResult, GenomeSpec, RepoContext } from "./loadGenome";
import { tryParseJson, resolveRepoPath, safeExists } from "./utils";

export async function validateTemporal(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const DOMAIN = "TEMPORAL";

  (genome.domains.temporal.audit?.ledgers ?? []).forEach((ledger) => {
    const ledgerPath = resolveRepoPath(context.repoRoot, ledger.file);
    if (!safeExists(ledgerPath)) {
      errors.push(`${DOMAIN}: Missing required ledger "${ledger.name}" (expected at ${ledgerPath})`);
      return;
    }

    const parsed = tryParseJson(ledgerPath);
    if (!parsed.ok) {
      errors.push(`${DOMAIN}: Ledger "${ledger.name}" is not valid JSON (${parsed.error}) at ${ledgerPath}`);
    } else if (typeof parsed.value !== "object") {
      warnings.push(`${DOMAIN}: Ledger "${ledger.name}" should be an object or array at ${ledgerPath}`);
    }
  });

  (genome.domains.temporal.timelines ?? []).forEach((timeline) => {
    (timeline.requiredFiles ?? []).forEach((file) => {
      const filePath = resolveRepoPath(context.repoRoot, file);
      if (!safeExists(filePath)) {
        errors.push(`${DOMAIN}: Timeline "${timeline.name}" missing required file "${file}" (expected at ${filePath})`);
      }
    });
  });

  return { domain: "temporal", errors, warnings };
}
