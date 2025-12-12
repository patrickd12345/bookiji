import { DomainValidationResult, GenomeSpec, RepoContext } from "./loadGenome";
import { exists, resolveRepoPath } from "./utils";

export async function validateOpsAI(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  (genome.domains.opsai.services ?? []).forEach((service) => {
    const servicePath = resolveRepoPath(context.repoRoot, service.folder);
    if (!exists(servicePath)) {
      errors.push(`OpsAI service '${service.id}' missing folder ${service.folder}`);
    }
  });

  (genome.domains.opsai.diagnostics?.smokeTests ?? []).forEach((script) => {
    const scriptPath = resolveRepoPath(context.repoRoot, script);
    if (!exists(scriptPath)) {
      warnings.push(`Diagnostics script not found: ${script}`);
    }
  });

  return { domain: "opsai", errors, warnings };
}
