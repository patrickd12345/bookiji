import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadGenome } from "@/genome/loadGenome";
import { DeprecationPolicy } from "@/governance/DeprecationPolicy";
import { DomainRegistry } from "@/governance/DomainRegistry";
import { EvolutionFlags } from "@/governance/EvolutionFlags";
import { GovernanceContract } from "@/governance/GovernanceContract";
import { MigrationRule } from "@/governance/MigrationRules";

const repoRoot = process.cwd();

const expectedContracts = [
  "src/governance/GovernanceContract.ts",
  "src/governance/EvolutionFlags.ts",
  "src/governance/DeprecationPolicy.ts",
  "src/governance/DomainRegistry.ts",
  "src/governance/MigrationRules.ts",
];

describe("Governance genome requirements", () => {
  const genomePath = path.join(repoRoot, "genome", "master-genome.yaml");

  it("declares governance contracts and marks them required", () => {
    const genome = loadGenome(genomePath);
    expect(genome.domains.governance.contracts).toEqual(expectedContracts);
    expect(genome.domains.governance.required).toBe(true);
  });

  it("has all governance contract files on disk", () => {
    expectedContracts.forEach((contract) => {
      const filePath = path.resolve(repoRoot, contract);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });
});

describe("Governance contract shapes", () => {
  const baseContract: GovernanceContract = {
    domain: "notifications_2",
    version: "1.0.0",
    stability: "stable",
    allowedMutations: ["add-field", "extend-contract"],
    forbiddenMutations: ["drop-field", "change-identifier"],
  };

  it("captures core governance contract details", () => {
    expect(baseContract.stability).toBe("stable");
    expect(baseContract.allowedMutations).toContain("extend-contract");
    expect(baseContract.forbiddenMutations).toContain("drop-field");
  });

  it("links evolution, deprecation, and migrations in the registry", () => {
    const flags: EvolutionFlags = { allowBreakingChanges: false, requireMigrationPlan: true, versionUpgradeRequired: "2.0.0" };
    const policy: DeprecationPolicy = {
      domain: "notifications_2",
      willDeprecate: true,
      sunsetDate: "2026-06-30",
      replacement: "notifications_3",
    };
    const migrations: MigrationRule[] = [
      { from: "1.0.0", to: "1.1.0", required: true, description: "Contract patch to support quiet hours" },
      { from: "1.1.0", to: "2.0.0", required: true },
    ];

    const registry: DomainRegistry = {
      entries: [
        {
          domain: "notifications",
          contract: baseContract,
          evolution: flags,
          deprecation: policy,
          migrations,
        },
      ],
    };

    expect(registry.entries[0].evolution?.requireMigrationPlan).toBe(true);
    expect(registry.entries[0].deprecation?.replacement).toBe("notifications_3");
    expect(registry.entries[0].migrations?.length).toBe(2);
  });
});
