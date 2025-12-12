import { DomainValidationResult, GenomeSpec, RepoContext } from "./loadGenome";
import { exists, isFileEmpty, resolveRepoPath } from "./utils";

export async function validateEvolution(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  (genome.domains.evolution.flags ?? []).forEach((flag) => {
    const flagPath = resolveRepoPath(context.repoRoot, flag);
    if (!exists(flagPath)) {
      errors.push(`Evolution flag document missing at ${flag}`);
    }
  });

  const roadmapFile = genome.domains.evolution.roadmap?.file;
  if (roadmapFile) {
    const roadmapPath = resolveRepoPath(context.repoRoot, roadmapFile);
    if (!exists(roadmapPath)) {
      errors.push(`Evolution roadmap missing at ${roadmapFile}`);
    } else if (isFileEmpty(roadmapPath)) {
      warnings.push(`Evolution roadmap file ${roadmapFile} is empty`);
    }
  }

  return { domain: "evolution", errors, warnings };
}
