import path from "node:path";
import { DomainValidationResult, GenomeSpec, RepoContext } from "../loadGenome";
import { checkDirectoryAccess, resolveRepoPath, safeExists } from "../utils";

export async function validateGovernance(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const DOMAIN = "GOVERNANCE";

  const governanceRoot = resolveRepoPath(context.repoRoot, path.join("src", "governance"));
  const access = checkDirectoryAccess(governanceRoot);
  if (!access.exists) {
    errors.push(`${DOMAIN}: Governance folder missing (expected at ${governanceRoot})`);
  } else if (!access.accessible) {
    errors.push(`${DOMAIN}: Governance folder at ${governanceRoot} is not accessible${access.error ? ` (${access.error})` : ""}`);
  }

  const governanceContracts = genome.domains.governance?.contracts ?? [];
  const governanceRequired = genome.domains.governance?.required ?? false;

  if (governanceRequired && governanceContracts.length === 0) {
    errors.push(`${DOMAIN}: Governance contracts marked as required but none declared in genome`);
  }

  (genome.domains.governance?.policies ?? []).forEach((policy) => {
    const policyPath = resolveRepoPath(context.repoRoot, policy);
    if (!safeExists(policyPath)) {
      errors.push(`${DOMAIN}: Missing required governance policy at ${policyPath}`);
    }
  });

  const changeControl = genome.domains.governance?.approvals?.changeControl;
  if (changeControl) {
    const changeControlPath = resolveRepoPath(context.repoRoot, changeControl);
    if (!safeExists(changeControlPath)) {
      errors.push(`${DOMAIN}: Missing change control approval file at ${changeControlPath}`);
    }
  }

  governanceContracts.forEach((contractPath) => {
    const resolved = resolveRepoPath(context.repoRoot, contractPath);
    const relative = path.relative(governanceRoot, resolved);
    const isInsideGovernance = relative && !relative.startsWith("..") && !path.isAbsolute(relative);

    if (!isInsideGovernance) {
      warnings.push(`${DOMAIN}: Contract "${contractPath}" is outside governance folder (resolved to ${resolved})`);
    }

    if (!safeExists(resolved)) {
      errors.push(`${DOMAIN}: Missing governance contract "${contractPath}" (expected at ${resolved})`);
    }
  });

  return { domain: "governance", errors, warnings };
}
