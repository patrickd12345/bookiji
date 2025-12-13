import { AnalyticsEnvelope } from "@/contracts/analytics/AnalyticsEnvelope";
import { TimelineBuildOptions, AuditTimeline, AuditFrame } from "./types";
import {
  cloneEnvelope,
  deepFreeze,
  detectSyntheticProvenance,
  deriveDomain,
  ensureOrdered,
  extractEvolution,
  extractTrustSafetySignals,
} from "./utils";

function enforceGovernance(envelope: AnalyticsEnvelope, domain: string, options: TimelineBuildOptions) {
  const registry = options.registry;
  const entry = registry?.entries.find((candidate) => candidate.domain === domain);
  if (!entry) {
    throw new Error(`Non-governed envelope detected for domain "${domain}" (id: ${envelope.id})`);
  }

  const cutoff = entry.deprecation?.sunsetDate ? Date.parse(entry.deprecation.sunsetDate) : undefined;
  if (entry.deprecation?.willDeprecate && cutoff && envelope.timestamp > cutoff) {
    throw new Error(`Domain "${domain}" cannot be replayed past cutoff ${entry.deprecation.sunsetDate} (envelope ${envelope.id})`);
  }

  return entry;
}

export function buildAuditTimeline(options: TimelineBuildOptions): AuditTimeline {
  const { id = "audit-timeline", envelopes, allowSynthetic = true, evolutionOverrides = {} } = options;
  ensureOrdered(envelopes);

  const frames: AuditFrame[] = [];
  let real = 0;
  let synthetic = 0;

  envelopes.forEach((inputEnvelope, index) => {
    const envelope = cloneEnvelope(inputEnvelope);
    const domain = deriveDomain(envelope.event.type);
    const registryEntry = enforceGovernance(envelope, domain, options);
    const { provenance, simTime, syntheticContext } = detectSyntheticProvenance(envelope);

    if (provenance === "synthetic" && !allowSynthetic) {
      throw new Error(`Synthetic envelope ${envelope.id} is not allowed in this audit timeline`);
    }

    if (provenance === "synthetic") {
      synthetic += 1;
    } else {
      real += 1;
    }

    const evolution = evolutionOverrides[domain] ?? extractEvolution(envelope, registryEntry.evolution);
    const trustSafety = extractTrustSafetySignals(envelope, provenance);
    const permitted =
      registryEntry.deprecation?.willDeprecate && registryEntry.deprecation.sunsetDate
        ? envelope.timestamp <= Date.parse(registryEntry.deprecation.sunsetDate)
        : !registryEntry.deprecation?.willDeprecate;
    const governance = {
      domain,
      permitted,
      reason: permitted ? undefined : registryEntry.deprecation?.sunsetDate ? `Domain ${domain} deprecated after ${registryEntry.deprecation.sunsetDate}` : `Domain ${domain} marked for deprecation`,
      evolution,
      deprecation: registryEntry.deprecation,
      registryEntry,
    };

    frames.push(
      deepFreeze({
        id: envelope.id,
        index,
        logicalTime: envelope.timebase.logical,
        timestamp: envelope.timestamp,
        simTime,
        envelope: deepFreeze(envelope),
        provenance,
        governance,
        evolution,
        trustSafety,
        syntheticContext,
      })
    );
  });

  const domains = Array.from(new Set(frames.map((frame) => frame.governance.domain))).sort();
  const evolutionFlags: Record<string, typeof frames[number]["evolution"]> = {};
  frames.forEach((frame) => {
    if (frame.evolution && !evolutionFlags[frame.governance.domain]) {
      evolutionFlags[frame.governance.domain] = frame.evolution;
    }
  });

  return deepFreeze({
    id,
    frames,
    startedAt: frames[0]?.timestamp ?? 0,
    endedAt: frames[frames.length - 1]?.timestamp ?? 0,
    registry: options.registry,
    sources: { real, synthetic },
    domains,
    evolutionFlags,
  });
}
