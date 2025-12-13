import path from "node:path";
import { DomainValidationResult, GenomeSpec, RepoContext } from "../loadGenome";
import { checkDirectoryAccess, isDirectoryPopulated, resolveRepoPath, safeExists } from "../utils";

export async function validateTrustSafety(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const DOMAIN = "TRUST & SAFETY";

  (genome.domains.trustSafety.ledgers ?? []).forEach((ledger) => {
    const ledgerPath = resolveRepoPath(context.repoRoot, ledger);
    if (!safeExists(ledgerPath)) {
      errors.push(`${DOMAIN}: Missing required ledger at ${ledgerPath}`);
    }
  });

  const drillsFolder = genome.domains.trustSafety.drills?.folder;
  if (drillsFolder) {
    const drillPath = resolveRepoPath(context.repoRoot, drillsFolder);
    const access = checkDirectoryAccess(drillPath);
    if (!access.exists) {
      errors.push(`${DOMAIN}: Drills folder missing at ${drillsFolder} (expected at ${drillPath})`);
    } else if (!access.accessible) {
      errors.push(`${DOMAIN}: Drills folder at ${drillPath} is not accessible${access.error ? ` (${access.error})` : ""}`);
    } else if (!isDirectoryPopulated(drillPath)) {
      warnings.push(`${DOMAIN}: Drills folder "${drillsFolder}" is empty`);
    }
  }

  const trustSafetyContracts = genome.domains.trust_safety;
  const contractsSchema = trustSafetyContracts?.schema;
  if (!contractsSchema) {
    errors.push(`${DOMAIN}: trust_safety schema folder not declared in genome spec`);
  } else {
    const schemaPath = resolveRepoPath(context.repoRoot, contractsSchema);
    const access = checkDirectoryAccess(schemaPath);
    if (!access.exists) {
      errors.push(`${DOMAIN}: trust_safety schema folder missing at ${contractsSchema} (expected at ${schemaPath})`);
    } else if (!access.accessible) {
      errors.push(`${DOMAIN}: trust_safety schema folder at ${schemaPath} is not accessible${access.error ? ` (${access.error})` : ""}`);
    }
  }

  (trustSafetyContracts?.required ?? []).forEach((fileName) => {
    if (!contractsSchema) return;
    const filePath = resolveRepoPath(context.repoRoot, path.join(contractsSchema, fileName));
    if (!safeExists(filePath)) {
      errors.push(`${DOMAIN}: Missing trust_safety contract "${fileName}" (expected at ${filePath})`);
    }
  });

  return { domain: "trust & safety", errors, warnings };
}
