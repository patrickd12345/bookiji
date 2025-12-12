import path from "node:path";
import { DomainValidationResult, GenomeSpec, RepoContext } from "./loadGenome";
import { exists, resolveRepoPath } from "./utils";

export async function validateCore(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const modules = genome.domains.core.modules ?? [];

  modules.forEach((module) => {
    const modulePath = resolveRepoPath(context.repoRoot, module.path);
    if (!exists(modulePath)) {
      errors.push(`Missing core module path: ${module.path}`);
      return;
    }

    (module.requiredFiles ?? []).forEach((file) => {
      const filePath = path.join(modulePath, file);
      if (!exists(filePath)) {
        errors.push(`Module ${module.id} is missing required file ${file}`);
      }
    });
  });

  (genome.domains.core.runtimeProfiles ?? []).forEach((profile) => {
    const configPath = resolveRepoPath(context.repoRoot, profile.config);
    if (!exists(configPath)) {
      errors.push(`Runtime profile ${profile.name} config not found at ${profile.config}`);
    }
  });

  return { domain: "core", errors, warnings };
}
