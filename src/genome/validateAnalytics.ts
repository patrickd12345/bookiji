import path from "node:path";
import { DomainValidationResult, GenomeSpec, RepoContext } from "./loadGenome";
import { resolveRepoPath, safeExists } from "./utils";

export async function validateAnalytics(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const DOMAIN = "ANALYTICS";

  const analytics = genome.domains.analytics;

  if (!analytics) {
    errors.push(`${DOMAIN}: Analytics domain missing from genome spec`);
    return { domain: "analytics", errors, warnings };
  }

  if (!analytics.schema) {
    errors.push(`${DOMAIN}: Schema root not declared in genome spec`);
    return { domain: "analytics", errors, warnings };
  }

  const schemaPath = resolveRepoPath(context.repoRoot, analytics.schema);
  if (!safeExists(schemaPath)) {
    errors.push(`${DOMAIN}: Schema folder missing at ${analytics.schema} (expected at ${schemaPath})`);
  }

  (analytics.required ?? []).forEach((fileName: string) => {
    const filePath = resolveRepoPath(context.repoRoot, path.join(analytics.schema ?? "", fileName));
    if (!safeExists(filePath)) {
      errors.push(`${DOMAIN}: Missing required analytics contract "${fileName}" (expected at ${filePath})`);
    }
  });

  return { domain: "analytics", errors, warnings };
}
