import { DomainValidationResult, GenomeSpec, RepoContext } from "./loadGenome";
import { isFileEmpty, resolveRepoPath, safeExists } from "./utils";

export async function validateEvolution(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const DOMAIN = "EVOLUTION";

  (genome.domains.evolution.flags ?? []).forEach((flag) => {
    const flagPath = resolveRepoPath(context.repoRoot, flag);
    if (!safeExists(flagPath)) {
      errors.push(`${DOMAIN}: Missing required flag document at ${flagPath}`);
    }
  });

  const roadmapFile = genome.domains.evolution.roadmap?.file;
  if (roadmapFile) {
    const roadmapPath = resolveRepoPath(context.repoRoot, roadmapFile);
    if (!safeExists(roadmapPath)) {
      errors.push(`${DOMAIN}: Missing required roadmap file "${roadmapFile}" (expected at ${roadmapPath})`);
    } else if (isFileEmpty(roadmapPath)) {
      warnings.push(`${DOMAIN}: Evolution roadmap file ${roadmapFile} is empty`);
    }
  }

  return { domain: "evolution", errors, warnings };
}
