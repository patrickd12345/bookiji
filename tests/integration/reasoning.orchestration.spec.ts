import { describe, expect, it } from "vitest";
import { ReasoningOrchestrator, ReasoningPersona, ReasoningTask } from "@/reasoning/orchestration";
import { DomainRegistry } from "@/governance/DomainRegistry";
import { AnalyticsEnvelope } from "@/contracts/analytics/AnalyticsEnvelope";
import { buildAuditTimeline } from "@/audit/timeline";

const registry: DomainRegistry = {
  entries: [
    {
      domain: "booking",
      contract: { domain: "booking", version: "v1", stability: "stable", allowedMutations: [], forbiddenMutations: [] },
    },
    {
      domain: "trust",
      contract: { domain: "trust", version: "v1", stability: "stable", allowedMutations: [], forbiddenMutations: [] },
      deprecation: { domain: "trust", willDeprecate: false },
    },
  ],
};

const baseEnvelope: AnalyticsEnvelope = {
  id: "env-1",
  version: "v1",
  timestamp: 1_700_000_000_000,
  timebase: { logical: 1 },
  source: "core",
  event: { type: "booking.created", payload: {} as any },
  metadata: { latencyP95Ms: 210 },
};

function baseTask(overrides?: Partial<ReasoningTask>): ReasoningTask {
  const constraints = {
    registry,
    ...overrides?.constraints,
  };

  return {
    question: overrides?.question ?? "What do we know?",
    inputs: {
      analytics: [baseEnvelope],
      ...overrides?.inputs,
    },
    constraints,
    ...overrides,
  };
}

function stubPersona(id: string, summary: string, topic = "latency", judgment: "risk" | "observation" = "risk"): ReasoningPersona {
  return {
    id,
    label: id,
    scope: "reliability",
    domains: ["booking"],
    assess: (task) => ({
      persona: id,
      scope: "reliability",
      findings: [
        {
          id: `${id}-${topic}`,
          topic,
          summary,
          judgment,
          signals: (task.inputs.analytics ?? []).map((envelope) => `${envelope.id}:${envelope.event.type}`),
          assumptions: ["bounded", "stateless"],
          domain: "booking",
          confidence: 0.6,
          provenance: ["analytics"],
        },
      ],
      uncertainties: [],
      assumptions: [],
      signals: [],
      governance: { permittedDomains: [], blockedDomains: [] },
      confidence: 0.6,
      reasoningTrace: [`persona:${id}`],
    }),
  };
}

describe("ReasoningOrchestrator (integration)", () => {
  it("keeps personas isolated by cloning inputs per run", async () => {
    const mutator: ReasoningPersona = {
      id: "mutator",
      label: "Mutator",
      scope: "reliability",
      domains: ["booking"],
      assess: (task) => {
        const envelope = task.inputs.analytics?.[0] as AnalyticsEnvelope | undefined;
        if (envelope) {
          (envelope as any).metadata = { mutated: true };
        }
        return {
          persona: "mutator",
          scope: "reliability",
          findings: [],
          uncertainties: [],
          assumptions: ["touched-metadata"],
          signals: [],
          governance: { permittedDomains: [], blockedDomains: [] },
          confidence: 0.5,
          reasoningTrace: ["mutated"],
        };
      },
    };

    const observer: ReasoningPersona = {
      id: "observer",
      label: "Observer",
      scope: "reliability",
      domains: ["booking"],
      assess: (task) => {
        const envelope = task.inputs.analytics?.[0] as AnalyticsEnvelope | undefined;
        const mutated = Boolean((envelope as any)?.metadata?.mutated);
        return {
          persona: "observer",
          scope: "reliability",
          findings: [],
          uncertainties: [],
          assumptions: mutated ? ["saw-mutation"] : ["no-mutation-visible"],
          signals: [],
          governance: { permittedDomains: [], blockedDomains: [] },
          confidence: 0.5,
          reasoningTrace: ["observed"],
        };
      },
    };

    const orchestrator = new ReasoningOrchestrator([mutator, observer]);
    const synthesis = await orchestrator.run(baseTask());

    const observerAssumptions = synthesis.provenance.assessments.find((assessment) => assessment.persona === "observer")
      ?.assumptions;
    expect(observerAssumptions).toContain("no-mutation-visible");
    expect(observerAssumptions).not.toContain("saw-mutation");
  });

  it("returns deterministic syntheses for identical inputs", async () => {
    const orchestrator = new ReasoningOrchestrator([stubPersona("p1", "latency healthy"), stubPersona("p2", "latency healthy")]);
    const task = baseTask();
    const first = await orchestrator.run(task);
    const second = await orchestrator.run(task);
    expect(first).toStrictEqual(second);
  });

  it("surfaces disagreements when personas conflict on the same topic", async () => {
    const orchestrator = new ReasoningOrchestrator([
      stubPersona("optimist", "latency within guardrails", "latency", "observation"),
      stubPersona("pessimist", "latency degradation detected", "latency", "risk"),
    ]);

    const synthesis = await orchestrator.run(baseTask());
    expect(synthesis.disagreements.length).toBeGreaterThan(0);
    expect(synthesis.consensus.length).toBe(0);
  });

  it("blocks reasoning for non-registered domains per governance", async () => {
    const orchestrator = new ReasoningOrchestrator([stubPersona("p1", "ignored")]);
    const envelope: AnalyticsEnvelope = {
      ...baseEnvelope,
      id: "env-unknown",
      event: { type: "booking.created", payload: {} as any },
    };

    await expect(
      orchestrator.run(
        baseTask({
          inputs: { analytics: [envelope] },
        })
      )
    ).rejects.toThrow(/not registered/);
  });

  it("preserves replay compatibility by not mutating audit timelines", async () => {
    const timeline = buildAuditTimeline({ envelopes: [baseEnvelope], registry });
    const persona: ReasoningPersona = {
      id: "auditor",
      label: "Auditor",
      scope: "governance",
      domains: ["booking"],
      assess: (task) => ({
        persona: "auditor",
        scope: "governance",
        findings: [],
        uncertainties: [],
        assumptions: task.inputs.audit ? [`frames:${task.inputs.audit.frames.length}`] : [],
        signals: [],
        governance: { permittedDomains: [], blockedDomains: [] },
        confidence: 0.7,
        reasoningTrace: ["audit-checked"],
      }),
    };

    const orchestrator = new ReasoningOrchestrator([persona]);
    const synthesis = await orchestrator.run(
      baseTask({
        inputs: { analytics: [baseEnvelope], audit: timeline },
      })
    );

    expect(Object.isFrozen(timeline.frames[0])).toBe(true);
    expect(synthesis.provenance.assessments[0].assumptions).toContain("frames:1");
  });
});
