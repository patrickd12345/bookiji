import { DomainValidationResult, GenomeSpec, RepoContext } from "./loadGenome";
import { resolveRepoPath, safeExists } from "./utils";

export async function validateSimCity(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const DOMAIN = "SIMCITY";

  const coreFiles = genome.domains.simcity.files ?? [];
  if (coreFiles.length === 0) {
    warnings.push(`${DOMAIN}: No core files listed in genome spec`);
  }

  coreFiles.forEach((relativePath) => {
    const resolved = resolveRepoPath(context.repoRoot, relativePath);
    if (!safeExists(resolved)) {
      errors.push(`${DOMAIN}: Missing required file at ${relativePath}`);
    }
  });

  const cockpitRoutes = genome.domains.simcity.cockpitRoutes ?? [];
  cockpitRoutes.forEach((relativePath) => {
    const resolved = resolveRepoPath(context.repoRoot, relativePath);
    if (!safeExists(resolved)) {
      warnings.push(`${DOMAIN}: Cockpit route missing at ${relativePath}`);
    }
  });

  return { domain: "simcity", errors, warnings };
}
