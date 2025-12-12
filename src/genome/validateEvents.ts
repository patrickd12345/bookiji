import fs from "node:fs";
import { DomainValidationResult, GenomeSpec, RepoContext } from "./loadGenome";
import { exists, isDirectoryPopulated, readFile, resolveRepoPath } from "./utils";

export async function validateEvents(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  (genome.domains.events.contracts ?? []).forEach((contract) => {
    const contractPath = resolveRepoPath(context.repoRoot, contract.file);
    if (!exists(contractPath)) {
      errors.push(`Event contract ${contract.id} missing at ${contract.file}`);
      return;
    }

    (contract.requiredSections ?? []).forEach((section) => {
      const contents = readFile(contractPath);
      if (!contents || !contents.includes(section)) {
        errors.push(`Contract ${contract.id} is missing required section token '${section}'`);
      }
    });
  });

  const catalog = genome.domains.events.catalog;
  if (catalog) {
    const catalogPath = resolveRepoPath(context.repoRoot, catalog.folder);
    if (!exists(catalogPath)) {
      errors.push(`Event catalog folder missing at ${catalog.folder}`);
    } else if (!isDirectoryPopulated(catalogPath)) {
      warnings.push(`Event catalog folder ${catalog.folder} is present but empty`);
    } else if (catalog.expectedExtensions && catalog.expectedExtensions.length > 0) {
      const entries = fs.readdirSync(catalogPath);
      const matches = entries.some((entry) =>
        (catalog.expectedExtensions ?? []).some((ext) => entry.endsWith(ext))
      );
      if (!matches) {
        warnings.push(
          `Event catalog at ${catalog.folder} does not contain files with expected extensions ${catalog.expectedExtensions.join(", ")}`
        );
      }
    }
  }

  (genome.domains.events.telemetry?.auditFeeds ?? []).forEach((feed) => {
    feed.files.forEach((file) => {
      const feedPath = resolveRepoPath(context.repoRoot, file);
      if (!exists(feedPath)) {
        errors.push(`Telemetry feed '${feed.name}' missing file ${file}`);
      }
    });
  });

  return { domain: "events", errors, warnings };
}
