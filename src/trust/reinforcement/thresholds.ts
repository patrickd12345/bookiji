import { DomainRegistry } from "@/governance/DomainRegistry";
import { deepFreeze } from "@/audit/utils";
import {
  InterventionJustification,
  RiskTrajectory,
  ThresholdCrossing,
  TrustSafetyThreshold,
} from "./types";

const compare = (value: number, comparator: TrustSafetyThreshold["comparator"], target: number): boolean => {
  if (comparator === "gt") return value > target;
  if (comparator === "gte") return value >= target;
  if (comparator === "lt") return value < target;
  return value <= target;
};

function governanceBlocked(registry: DomainRegistry | undefined, domain: string): boolean {
  const entry = registry?.entries.find((candidate) => candidate.domain === domain);
  if (!entry) return true;
  return Boolean(entry.deprecation?.willDeprecate);
}

function contractMismatch(registry: DomainRegistry | undefined, threshold: TrustSafetyThreshold): boolean {
  const entry = registry?.entries.find((candidate) => candidate.domain === threshold.domain);
  if (!entry) return true;
  return entry.contract.version !== threshold.contractVersion;
}

export function evaluateThresholds(
  trajectory: RiskTrajectory,
  thresholds: readonly TrustSafetyThreshold[],
  registry?: DomainRegistry,
): { crossings: readonly ThresholdCrossing[]; justifications: readonly InterventionJustification[] } {
  const crossings: ThresholdCrossing[] = [];
  const justifications: InterventionJustification[] = [];
  const firstCrossing = new Set<string>();
  const previousValues: Record<string, number> = {};

  trajectory.snapshots.forEach((snapshot) => {
    const domainThresholds = thresholds.filter((threshold) => threshold.domain === snapshot.domain);
    domainThresholds.forEach((threshold) => {
      const metric = snapshot.metrics.find((candidate) => candidate.dimension === threshold.dimension);
      const value = metric?.value ?? 0;
      const crossed = compare(value, threshold.comparator, threshold.value);
      crossings.push(
        deepFreeze({
          thresholdId: threshold.id,
          snapshotId: snapshot.id,
          dimension: threshold.dimension,
          value,
          comparator: threshold.comparator,
          crossed,
          occurredAt: snapshot.timestamp,
          evolution: threshold.evolution ?? snapshot.evolution,
          signals: metric?.signals ?? snapshot.signals,
          governance: snapshot.governance,
          confidence: metric?.confidence ?? "low",
        }),
      );

      const prevKey = `${snapshot.domain}:${threshold.dimension}`;
      const previousValue = previousValues[prevKey] ?? value;
      previousValues[prevKey] = value;

      if (!crossed || firstCrossing.has(threshold.id)) {
        return;
      }

      firstCrossing.add(threshold.id);
      const blockedByGovernance = governanceBlocked(registry, threshold.domain);
      const mismatchedContract = contractMismatch(registry, threshold);
      const deprecatedRule = Boolean(threshold.deprecated);
      const decision: InterventionJustification["decision"] =
        blockedByGovernance || mismatchedContract || deprecatedRule ? "blocked" : "justified";
      const governanceEntry = registry?.entries.find((candidate) => candidate.domain === snapshot.domain);

      const assumptions = [
        "Reasoning is diagnostic-only; no interventions or notifications are emitted.",
        "All thresholds must originate from Trust & Safety contracts; deprecated rules cannot justify action.",
      ];
      if (blockedByGovernance) {
        assumptions.push(`Governance marks domain "${snapshot.domain}" as deprecated or non-permitted.`);
      }
      if (mismatchedContract) {
        assumptions.push("Threshold contract version does not match governance registry.");
      }
      if (deprecatedRule) {
        assumptions.push("Threshold is explicitly deprecated and only used for historical analysis.");
      }

      const justification: InterventionJustification = deepFreeze({
        id: `${snapshot.id}:${threshold.id}:justification`,
        domain: snapshot.domain,
        threshold,
        snapshotId: snapshot.id,
        decision,
        whyNow: `Value ${value.toFixed(3)} ${threshold.comparator} ${threshold.value.toFixed(3)} for ${threshold.dimension}.`,
        whyNotEarlier: `Previous value ${previousValue.toFixed(3)} stayed below justification threshold.`,
        whyThisIntervention: `${threshold.label} via ${threshold.interventionClass} class. ${threshold.description ?? "Contract-governed threshold."}`,
        governance: { ...snapshot.governance, registryEntry: governanceEntry },
        confidence: metric?.confidence ?? "low",
        signals: metric?.signals ?? snapshot.signals,
        assumptions,
        contractsReferenced: governanceEntry ? [governanceEntry.contract.version, threshold.contractVersion] : [threshold.contractVersion],
      });

      justifications.push(justification);
    });
  });

  return { crossings: deepFreeze(crossings), justifications: deepFreeze(justifications) };
}
