import { DomainValidationResult, GenomeSpec, RepoContext } from "./loadGenome";
import { exists, isDirectoryPopulated, resolveRepoPath } from "./utils";

export async function validateTrustSafety(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  (genome.domains.trustSafety.ledgers ?? []).forEach((ledger) => {
    const ledgerPath = resolveRepoPath(context.repoRoot, ledger);
    if (!exists(ledgerPath)) {
      errors.push(`Trust & Safety ledger missing at ${ledger}`);
    }
  });

  const drillsFolder = genome.domains.trustSafety.drills?.folder;
  if (drillsFolder) {
    const drillPath = resolveRepoPath(context.repoRoot, drillsFolder);
    if (!exists(drillPath)) {
      errors.push(`Trust & Safety drills folder missing at ${drillsFolder}`);
    } else if (!isDirectoryPopulated(drillPath)) {
      warnings.push(`Trust & Safety drills folder ${drillsFolder} is empty`);
    }
  }

  return { domain: "trust & safety", errors, warnings };
}
