import { DomainValidationResult, GenomeSpec, RepoContext } from "./loadGenome";
import { exists, isDirectoryPopulated, resolveRepoPath } from "./utils";

export async function validateBI(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  (genome.domains.businessIntelligence.telemetry?.funnels ?? []).forEach((folder) => {
    const funnelPath = resolveRepoPath(context.repoRoot, folder);
    if (!exists(funnelPath)) {
      errors.push(`Business intelligence funnel directory missing at ${folder}`);
    }
  });

  (genome.domains.businessIntelligence.qualityGates ?? []).forEach((gate) => {
    const gatePath = resolveRepoPath(context.repoRoot, gate);
    if (!exists(gatePath)) {
      warnings.push(`Quality gate path missing at ${gate}`);
    } else if (!isDirectoryPopulated(gatePath)) {
      warnings.push(`Quality gate path ${gate} exists but is empty`);
    }
  });

  return { domain: "business intelligence", errors, warnings };
}
