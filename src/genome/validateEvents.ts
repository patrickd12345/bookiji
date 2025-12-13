import { DomainValidationResult, GenomeSpec, RepoContext } from "./loadGenome";
import { isDirectoryPopulated, readFile, resolveRepoPath, safeExists, safeReadDir } from "./utils";

export async function validateEvents(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const DOMAIN = "EVENTS";

  (genome.domains.events.contracts ?? []).forEach((contract) => {
    const contractPath = resolveRepoPath(context.repoRoot, contract.file);
    if (!safeExists(contractPath)) {
      errors.push(`${DOMAIN}: Missing required event contract "${contract.id}" (expected at ${contractPath})`);
      return;
    }

    (contract.requiredSections ?? []).forEach((section) => {
      const contents = readFile(contractPath);
      if (contents === null) {
        errors.push(`${DOMAIN}: Unable to read contract "${contract.id}" at ${contractPath}`);
      } else if (!contents.includes(section)) {
        errors.push(`${DOMAIN}: Contract "${contract.id}" missing required section token "${section}"`);
      }
    });
  });

  const catalog = genome.domains.events.catalog;
  if (catalog) {
    const catalogPath = resolveRepoPath(context.repoRoot, catalog.folder);
    if (!safeExists(catalogPath)) {
      errors.push(`${DOMAIN}: Missing required event catalog folder "${catalog.folder}" (expected at ${catalogPath})`);
    } else if (!isDirectoryPopulated(catalogPath)) {
      warnings.push(`${DOMAIN}: Event catalog folder "${catalog.folder}" is present but empty`);
    } else if (catalog.expectedExtensions && catalog.expectedExtensions.length > 0) {
      const entries = safeReadDir(catalogPath);
      const matches = entries.some((entry) =>
        (catalog.expectedExtensions ?? []).some((ext) => entry.endsWith(ext))
      );
      if (!matches) {
        warnings.push(
          `${DOMAIN}: Event catalog at "${catalog.folder}" does not contain files with expected extensions ${catalog.expectedExtensions.join(", ")}`
        );
      }
    }
  }

  (genome.domains.events.telemetry?.auditFeeds ?? []).forEach((feed) => {
    feed.files.forEach((file) => {
      const feedPath = resolveRepoPath(context.repoRoot, file);
      if (!safeExists(feedPath)) {
        errors.push(`${DOMAIN}: Telemetry feed "${feed.name}" missing required file "${file}" (expected at ${feedPath})`);
      }
    });
  });

  return { domain: "events", errors, warnings };
}
