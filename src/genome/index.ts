import path from "node:path";
import {
  DomainValidationResult,
  GenomeSpec,
  RepoContext,
  loadGenome,
} from "./loadGenome";
import { validateAnalytics } from "./validateAnalytics";
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

export interface RunGenomeOptions {
  repoRoot?: string;
  quiet?: boolean;
  explain?: boolean;
}

const registry: GenomeValidator[] = [
  { domain: "core", run: validateCore },
  { domain: "events", run: validateEvents },
  { domain: "analytics", run: validateAnalytics },
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
    console.log("  OK: No findings");
    return;
  }

  result.errors.forEach((error) => {
    console.error(`  ERROR: ${error}`);
  });

  result.warnings.forEach((warning) => {
    console.warn(`  WARN: ${warning}`);
  });
}

function printExplanationIntro(genome?: GenomeSpec): void {
  console.log("==== Genome Linter Explanation ====");
  console.log(
    genome?.version
      ? `The Genome defines Bookiji OS ${genome.version} architecture boundaries.`
      : "The Genome defines Bookiji OS architecture boundaries."
  );
  console.log("Errors = required structure violations.");
  console.log("Warnings = optional or incomplete configuration.");
  console.log(
    "Checks cover: core modules, events, temporal ledgers, OpsAI services, SimCity scenarios, help center docs, notification channels and contracts, trust & safety drills and contracts, business intelligence assets, governance controls, and evolution artifacts."
  );
  console.log("");
}

function printDomainBreakdown(results: DomainValidationResult[]): void {
  results.forEach((result) => {
    const header = `[${result.domain.toUpperCase()}]`;
    const errorSummary =
      result.errors.length === 0
        ? "0 errors"
        : `${result.errors.length} error${result.errors.length === 1 ? "" : "s"} (${result.errors[0]})`;
    const warningSummary =
      result.warnings.length === 0
        ? "0 warnings"
        : `${result.warnings.length} warning${result.warnings.length === 1 ? "" : "s"} (${result.warnings[0]})`;
    console.log(`${header}`);
    console.log(`  ${errorSummary}`);
    console.log(`  ${warningSummary}`);
  });
}

export async function runGenomeLinter(options?: RunGenomeOptions): Promise<GenomeRunResult> {
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
      const fallback: DomainValidationResult = { domain: validator.domain, errors: [message], warnings: [] };
      results.push(fallback);
      if (!options?.quiet) {
        formatResult(fallback);
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

  if (options?.explain) {
    console.log("");
    printExplanationIntro(genome);
    printDomainBreakdown(results);
  }

  if (!options?.explain && totalErrors > 0) {
    process.exitCode = 1;
  }

  return { genome, results, totalErrors, totalWarnings };
}
