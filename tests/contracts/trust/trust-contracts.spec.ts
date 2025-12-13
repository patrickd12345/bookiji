import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadGenome } from "@/genome/loadGenome";
import { CancellationPattern } from "@/trust/contracts/CancellationPattern";
import { FraudSignal } from "@/trust/contracts/FraudSignal";
import { InterventionRule } from "@/trust/contracts/InterventionRule";
import { NoShowProfile } from "@/trust/contracts/NoShowProfile";
import { ReliabilityModel } from "@/trust/contracts/ReliabilityModel";
import { RiskScore } from "@/trust/contracts/RiskScore";

const repoRoot = process.cwd();

describe("Trust & Safety contract schema", () => {
  it("declares trust_safety schema and required files", () => {
    const genome = loadGenome(path.join(repoRoot, "genome", "master-genome.yaml"));
    expect(genome.domains.trust_safety?.schema).toBe("src/trust/contracts");
    expect(genome.domains.trust_safety?.required).toEqual([
      "FraudSignal.ts",
      "RiskScore.ts",
      "CancellationPattern.ts",
      "NoShowProfile.ts",
      "ReliabilityModel.ts",
      "InterventionRule.ts",
    ]);
  });

  it("has all trust & safety contract files available", () => {
    const genome = loadGenome(path.join(repoRoot, "genome", "master-genome.yaml"));
    const schemaRoot = genome.domains.trust_safety?.schema ?? "";
    (genome.domains.trust_safety?.required ?? []).forEach((fileName) => {
      const filePath = path.resolve(repoRoot, schemaRoot, fileName);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });
});

describe("Trust & Safety contract shapes", () => {
  it("captures fraud signals and risk scoring factors", () => {
    const signal: FraudSignal = { signal: "rapid-book-cancel", weight: 0.65, metadata: { windowMinutes: 10 } };
    const score: RiskScore = { userId: "user-1", score: 74, factors: [signal] };

    expect(signal.weight).toBeGreaterThan(0);
    expect(score.factors[0].metadata?.windowMinutes).toBe(10);
  });

  it("tracks cancellation, no-show, reliability, and interventions", () => {
    const cancellation: CancellationPattern = { userId: "user-2", frequency: 0.5, last30Days: 3 };
    const noShow: NoShowProfile = { userId: "user-2", noShows: 4, riskLevel: "high" };
    const reliability: ReliabilityModel = { providerId: "provider-9", score: 92, updatedAt: Date.now() };
    const rule: InterventionRule = { condition: "score>80", action: "flag_for_review" };

    expect(cancellation.last30Days).toBeGreaterThanOrEqual(3);
    expect(noShow.riskLevel).toBe("high");
    expect(reliability.score).toBeGreaterThan(0);
    expect(rule.action).toBe("flag_for_review");
  });
});
