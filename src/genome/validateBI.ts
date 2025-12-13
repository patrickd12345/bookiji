import { DomainValidationResult, GenomeSpec, RepoContext } from "./loadGenome";
import { isDirectoryPopulated, resolveRepoPath, safeExists } from "./utils";

export async function validateBI(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const DOMAIN = "BUSINESS INTELLIGENCE";

  (genome.domains.businessIntelligence.telemetry?.funnels ?? []).forEach((folder) => {
    const funnelPath = resolveRepoPath(context.repoRoot, folder);
    if (!safeExists(funnelPath)) {
      errors.push(`${DOMAIN}: Missing required telemetry funnel directory at ${funnelPath}`);
    }
  });

  (genome.domains.businessIntelligence.qualityGates ?? []).forEach((gate) => {
    const gatePath = resolveRepoPath(context.repoRoot, gate);
    if (!safeExists(gatePath)) {
      warnings.push(`${DOMAIN}: Quality gate path missing at ${gatePath}`);
    } else if (!isDirectoryPopulated(gatePath)) {
      warnings.push(`${DOMAIN}: Quality gate path "${gate}" exists but is empty`);
    }
  });

  return { domain: "business intelligence", errors, warnings };
}
