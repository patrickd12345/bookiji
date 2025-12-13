import { DomainValidationResult, GenomeSpec, RepoContext } from "./loadGenome";
import { isDirectoryPopulated, resolveRepoPath, safeExists } from "./utils";

export async function validateSimCity(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const DOMAIN = "SIMCITY";

  const scenarios = genome.domains.simcity.scenarios;
  if (scenarios?.folder) {
    const scenarioPath = resolveRepoPath(context.repoRoot, scenarios.folder);
    if (!safeExists(scenarioPath)) {
      warnings.push(`${DOMAIN}: Optional scenarios folder missing at ${scenarios.folder} (expected at ${scenarioPath})`);
    } else if (!isDirectoryPopulated(scenarioPath)) {
      warnings.push(`${DOMAIN}: Scenarios folder "${scenarios.folder}" is empty`);
    }
  } else {
    warnings.push(`${DOMAIN}: SimCity scenarios folder not declared in genome spec`);
  }

  if (scenarios?.chaosProfile) {
    const chaosPath = resolveRepoPath(context.repoRoot, scenarios.chaosProfile);
    if (!safeExists(chaosPath)) {
      warnings.push(`${DOMAIN}: Optional chaos profile missing at ${scenarios.chaosProfile} (expected at ${chaosPath})`);
    }
  }

  const traffic = genome.domains.simcity.traffic;
  if (traffic?.samples) {
    const samplesPath = resolveRepoPath(context.repoRoot, traffic.samples);
    if (!safeExists(samplesPath)) {
      warnings.push(`${DOMAIN}: Traffic samples folder missing at ${traffic.samples}`);
    }
  }

  if (traffic?.loadPatterns) {
    const patternPath = resolveRepoPath(context.repoRoot, traffic.loadPatterns);
    if (!safeExists(patternPath)) {
      warnings.push(`${DOMAIN}: Traffic load pattern folder missing at ${traffic.loadPatterns}`);
    }
  }

  const contractFiles = [
    "src/contracts/analytics/AnalyticsEnvelope.ts",
    "src/contracts/analytics/StandardizedEvent.ts",
    "src/contracts/analytics/Timebase.ts",
    "src/simcity/contracts/SimCityEventContract.ts",
    "src/simcity/contracts/ScenarioContract.ts",
    "src/simcity/contracts/SimCityEnvelopeAdapter.ts",
    "src/simcity/v2/types.ts",
    "src/simcity/v2/rng.ts",
    "src/simcity/v2/actors.ts",
    "src/simcity/v2/envelope.ts",
    "src/simcity/v2/market.ts",
    "src/simcity/v2/index.ts",
  ];

  contractFiles.forEach((relativePath) => {
    const contractPath = resolveRepoPath(context.repoRoot, relativePath);
    if (!safeExists(contractPath)) {
      errors.push(`${DOMAIN}: Missing contract artifact at ${relativePath} (expected at ${contractPath})`);
    }
  });

  return { domain: "simcity", errors, warnings };
}
