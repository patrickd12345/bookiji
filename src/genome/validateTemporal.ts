import { DomainValidationResult, GenomeSpec, RepoContext } from "./loadGenome";
import { exists, tryParseJson, resolveRepoPath } from "./utils";

export async function validateTemporal(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  (genome.domains.temporal.audit?.ledgers ?? []).forEach((ledger) => {
    const ledgerPath = resolveRepoPath(context.repoRoot, ledger.file);
    if (!exists(ledgerPath)) {
      errors.push(`Temporal ledger '${ledger.name}' missing at ${ledger.file}`);
      return;
    }

    const parsed = tryParseJson(ledgerPath);
    if (!parsed.ok) {
      errors.push(`Temporal ledger '${ledger.name}' is not valid JSON: ${parsed.error}`);
    } else if (typeof parsed.value !== "object") {
      warnings.push(`Temporal ledger '${ledger.name}' should be an object or array`);
    }
  });

  (genome.domains.temporal.timelines ?? []).forEach((timeline) => {
    (timeline.requiredFiles ?? []).forEach((file) => {
      const filePath = resolveRepoPath(context.repoRoot, file);
      if (!exists(filePath)) {
        errors.push(`Timeline '${timeline.name}' missing file ${file}`);
      }
    });
  });

  return { domain: "temporal", errors, warnings };
}
