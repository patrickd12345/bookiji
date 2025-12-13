import path from "node:path";
import { DomainValidationResult, GenomeSpec, RepoContext } from "./loadGenome";
import { resolveRepoPath, safeExists } from "./utils";

export async function validateCore(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const DOMAIN = "CORE";
  const modules = genome.domains.core.modules ?? [];

  modules.forEach((module) => {
    const modulePath = resolveRepoPath(context.repoRoot, module.path);
    if (!safeExists(modulePath)) {
      errors.push(`${DOMAIN}: Missing required module "${module.id}" (expected at ${modulePath})`);
      return;
    }

    (module.requiredFiles ?? []).forEach((file) => {
      const filePath = path.join(modulePath, file);
      if (!safeExists(filePath)) {
        errors.push(`${DOMAIN}: Missing required file "${file}" for module "${module.id}" (expected at ${filePath})`);
      }
    });
  });

  (genome.domains.core.runtimeProfiles ?? []).forEach((profile) => {
    const configPath = resolveRepoPath(context.repoRoot, profile.config);
    if (!safeExists(configPath)) {
      errors.push(
        `${DOMAIN}: Runtime profile "${profile.name}" missing required config "${profile.config}" (expected at ${configPath})`
      );
    }
  });

  return { domain: "core", errors, warnings };
}
