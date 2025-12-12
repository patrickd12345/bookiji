import { DomainValidationResult, GenomeSpec, RepoContext } from "./loadGenome";
import { exists, isDirectoryPopulated, resolveRepoPath } from "./utils";

export async function validateSimCity(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const scenarios = genome.domains.simcity.scenarios;
  if (scenarios?.folder) {
    const scenarioPath = resolveRepoPath(context.repoRoot, scenarios.folder);
    if (!exists(scenarioPath)) {
      errors.push(`SimCity scenarios folder missing at ${scenarios.folder}`);
    } else if (!isDirectoryPopulated(scenarioPath)) {
      warnings.push(`SimCity scenarios folder ${scenarios.folder} is empty`);
    }
  } else {
    warnings.push("SimCity scenarios folder not declared in genome spec");
  }

  if (scenarios?.chaosProfile) {
    const chaosPath = resolveRepoPath(context.repoRoot, scenarios.chaosProfile);
    if (!exists(chaosPath)) {
      errors.push(`Chaos profile missing at ${scenarios.chaosProfile}`);
    }
  }

  const traffic = genome.domains.simcity.traffic;
  if (traffic?.samples) {
    const samplesPath = resolveRepoPath(context.repoRoot, traffic.samples);
    if (!exists(samplesPath)) {
      warnings.push(`Traffic samples folder missing at ${traffic.samples}`);
    }
  }

  if (traffic?.loadPatterns) {
    const patternPath = resolveRepoPath(context.repoRoot, traffic.loadPatterns);
    if (!exists(patternPath)) {
      warnings.push(`Traffic load pattern folder missing at ${traffic.loadPatterns}`);
    }
  }

  return { domain: "simcity", errors, warnings };
}
