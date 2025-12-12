import path from "node:path";
import {
  DomainValidationResult,
  GenomeSpec,
  RepoContext,
  loadGenome,
} from "./loadGenome";
import { validateCore } from "./validateCore";
import { validateEvents } from "./validateEvents";
import { validateTemporal } from "./validateTemporal";
import { validateOpsAI } from "./validateOpsAI";
import { validateSimCity } from "./validateSimCity";
import { validateHelpCenter } from "./validateHelpCenter";
import { validateNotifications } from "./validateNotifications";
import { validateTrustSafety } from "./validateTrustSafety";
import { validateBI } from "./validateBI";
import { validateGovernance } from "./validateGovernance";
import { validateEvolution } from "./validateEvolution";

interface GenomeValidator {
  domain: string;
  run: (genome: GenomeSpec, context: RepoContext) => Promise<DomainValidationResult>;
}

export interface GenomeRunResult {
  genome?: GenomeSpec;
  results: DomainValidationResult[];
  totalErrors: number;
  totalWarnings: number;
}

const registry: GenomeValidator[] = [
  { domain: "core", run: validateCore },
  { domain: "events", run: validateEvents },
  { domain: "temporal", run: validateTemporal },
  { domain: "opsai", run: validateOpsAI },
  { domain: "simcity", run: validateSimCity },
  { domain: "help center", run: validateHelpCenter },
  { domain: "notifications", run: validateNotifications },
  { domain: "trust & safety", run: validateTrustSafety },
  { domain: "business intelligence", run: validateBI },
  { domain: "governance", run: validateGovernance },
  { domain: "evolution", run: validateEvolution },
];

function formatResult(result: DomainValidationResult): void {
  const header = `[${result.domain.toUpperCase()}]`;
  console.log(`\n${header}`);
  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log("  ✓ No findings");
    return;
  }

  result.errors.forEach((error) => {
    console.error(`  ✖ ${error}`);
  });

  result.warnings.forEach((warning) => {
    console.warn(`  ⚠ ${warning}`);
  });
}

export async function runGenomeLinter(options?: {
  repoRoot?: string;
  quiet?: boolean;
}): Promise<GenomeRunResult> {
  const repoRoot = options?.repoRoot ?? process.cwd();
  const genomePath = path.join(repoRoot, "genome", "master-genome.yaml");
  const results: DomainValidationResult[] = [];
  let genome: GenomeSpec | undefined;

  try {
    genome = loadGenome(genomePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to load genome spec: ${message}`);
    const failure: GenomeRunResult = { results: [], totalErrors: 1, totalWarnings: 0 };
    process.exitCode = 1;
    return failure;
  }

  const context: RepoContext = { repoRoot, genomePath };

  for (const validator of registry) {
    try {
      const result = await validator.run(genome, context);
      results.push(result);
      if (!options?.quiet) {
        formatResult(result);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ domain: validator.domain, errors: [message], warnings: [] });
      if (!options?.quiet) {
        formatResult({ domain: validator.domain, errors: [message], warnings: [] });
      }
    }
  }

  const totalErrors = results.reduce((acc, item) => acc + item.errors.length, 0);
  const totalWarnings = results.reduce((acc, item) => acc + item.warnings.length, 0);

  if (!options?.quiet) {
    console.log("\n==== Genome Lint Summary ====");
    console.log(`Errors: ${totalErrors}`);
    console.log(`Warnings: ${totalWarnings}`);
  }

  if (totalErrors > 0) {
    process.exitCode = 1;
  }

  return { genome, results, totalErrors, totalWarnings };
}
