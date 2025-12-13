import { AnalyticsEnvelope } from "@/contracts/analytics/AnalyticsEnvelope";
import { AuditTimeline } from "@/audit/types";
import { deriveDomain, deepFreeze } from "@/audit/utils";
import { DomainRegistry, DomainRegistryEntry } from "@/governance/DomainRegistry";
import { RiskTrajectory } from "@/trust/reinforcement/types";
import { ReasoningPersona, PersonaAssessment, Finding, Uncertainty } from "./ReasoningPersona";
import { Disagreement, ReasoningSynthesis, GovernanceSynthesisTrace } from "./ReasoningSynthesis";
import { ReasoningTask } from "./ReasoningTask";

type PersonaAssessmentInput = PersonaAssessment | Promise<PersonaAssessment>;

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

function normalizeFinding(finding: Finding): Finding {
  return {
    ...finding,
    assumptions: unique(finding.assumptions ?? []),
    signals: unique(finding.signals ?? []),
    provenance: finding.provenance ? unique(finding.provenance) : undefined,
    confidence: Math.max(0, Math.min(1, finding.confidence ?? 0)),
  };
}

export class ReasoningOrchestrator {
  private readonly personas: ReasoningPersona[];

  constructor(personas: ReasoningPersona[]) {
    const uniqueIds = new Set(personas.map((persona) => persona.id));
    if (uniqueIds.size !== personas.length) {
      throw new Error("Reasoning personas must have unique ids");
    }
    this.personas = personas;
  }

  async run(task: ReasoningTask): Promise<ReasoningSynthesis> {
    const frozenTask = deepFreeze(cloneValue(task));
    const governance = this.enforceGovernance(frozenTask);
    const assessments: PersonaAssessment[] = [];

    for (const persona of this.personas) {
      const personaTask = cloneValue(frozenTask);
      const assessment = await this.guardAssessment(persona.assess(personaTask), persona, governance);
      assessments.push(assessment);
    }

    return this.buildSynthesis(frozenTask.question, assessments, governance);
  }

  private async guardAssessment(
    assessmentInput: PersonaAssessmentInput,
    persona: ReasoningPersona,
    governance: GovernanceSynthesisTrace
  ): Promise<PersonaAssessment> {
    const assessment = await assessmentInput;
    const blockedDomains = governance.blockedDomains.filter((domain) => persona.domains.includes(domain));
    const findings = assessment.findings ?? [];
    const uncertainties = assessment.uncertainties ?? [];

    return deepFreeze({
      ...assessment,
      persona: assessment.persona || persona.id,
      scope: assessment.scope || persona.scope,
      governance: {
        permittedDomains: governance.domains.filter((domain) => !blockedDomains.includes(domain)),
        blockedDomains,
      },
      findings: findings.map(normalizeFinding).sort((a, b) => a.id.localeCompare(b.id)),
      uncertainties: [...uncertainties].sort((a, b) => a.id.localeCompare(b.id)),
      assumptions: unique(assessment.assumptions ?? []),
      signals: unique(assessment.signals ?? []),
      confidence: Math.max(0, Math.min(1, assessment.confidence ?? 0)),
      reasoningTrace: assessment.reasoningTrace ?? [],
    });
  }

  private enforceGovernance(task: ReasoningTask): GovernanceSynthesisTrace {
    const domains = this.collectDomains(task);
    const registry = task.constraints.registry;
    const blocked: string[] = [];
    const deprecated: string[] = [];

    domains.forEach((domain) => {
      const entry = this.resolveRegistryEntry(domain, registry);
      if (entry.deprecation?.willDeprecate && !task.constraints.allowDeprecated) {
        deprecated.push(domain);
        blocked.push(domain);
      }
    });

    if (blocked.length) {
      throw new Error(`Governance blocked reasoning for domains: ${blocked.sort().join(", ")}`);
    }

    const registryVersion = registry.entries.map((entry) => entry.contract.version).sort().join("|") || undefined;
    return {
      domains: Array.from(domains).sort(),
      blockedDomains: blocked.sort(),
      deprecatedDomains: deprecated.sort(),
      registryVersion,
    };
  }

  private resolveRegistryEntry(domain: string, registry: DomainRegistry): DomainRegistryEntry {
    const entry = registry.entries.find((candidate) => candidate.domain === domain);
    if (!entry) {
      throw new Error(`Domain "${domain}" is not registered for reasoning`);
    }
    return entry;
  }

  private collectDomains(task: ReasoningTask): Set<string> {
    const domains = new Set<string>();
    const analytics = task.inputs.analytics ?? [];
    analytics.forEach((envelope: AnalyticsEnvelope) => {
      domains.add(deriveDomain(envelope.event.type));
    });

    const trust = task.inputs.trust ?? [];
    trust.forEach((trajectory: RiskTrajectory) => {
      trajectory.snapshots.forEach((snapshot) => domains.add(snapshot.domain));
    });

    if (task.inputs.audit) {
      const timeline: AuditTimeline = task.inputs.audit;
      timeline.domains?.forEach((domain) => domains.add(domain));
      timeline.frames?.forEach((frame) => domains.add(frame.governance.domain));
    }

    const simcityDomains = task.inputs.simcity?.domains ?? [];
    simcityDomains.forEach((domain) => domains.add(domain));

    return domains;
  }

  private buildSynthesis(
    question: string,
    assessments: PersonaAssessment[],
    governance: GovernanceSynthesisTrace
  ): ReasoningSynthesis {
    const consensus = this.buildConsensus(assessments);
    const disagreements = this.buildDisagreements(assessments);
    const uncertainties = this.collectUncertainties(assessments);
    const confidence =
      assessments.length === 0 ? 0 : assessments.reduce((total, assessment) => total + assessment.confidence, 0) / assessments.length;

    const notes = [
      `Personas consulted: ${assessments.map((assessment) => assessment.persona).join(", ")}`,
      `Governance domains enforced: ${governance.domains.join(", ") || "none"}`,
      disagreements.length ? `Disagreements recorded: ${disagreements.length}` : "No disagreements detected",
    ];

    return deepFreeze({
      question,
      consensus,
      disagreements,
      uncertainties,
      confidence,
      notes,
      provenance: {
        assessments,
        governance,
      },
    });
  }

  private buildConsensus(assessments: PersonaAssessment[]): Finding[] {
    const topics = new Map<string, { personas: Set<string>; findings: Finding[] }>();

    assessments.forEach((assessment) => {
      assessment.findings.forEach((finding) => {
        const topic = finding.topic || finding.id || finding.summary;
        const entry = topics.get(topic);
        if (entry) {
          entry.personas.add(assessment.persona);
          entry.findings.push(finding);
        } else {
          topics.set(topic, { personas: new Set([assessment.persona]), findings: [finding] });
        }
      });
    });

    const consensus: Finding[] = [];
    topics.forEach((value, topic) => {
      const uniqueSummaries = new Set(value.findings.map((finding) => `${finding.summary}|${finding.judgment}`));
      if (value.personas.size > 1 && uniqueSummaries.size === 1) {
        const mergedSignals = new Set<string>();
        const mergedAssumptions = new Set<string>();
        const mergedProvenance = new Set<string>();
        value.findings.forEach((finding) => {
          finding.signals.forEach((signal) => mergedSignals.add(signal));
          finding.assumptions.forEach((assumption) => mergedAssumptions.add(assumption));
          (finding.provenance ?? []).forEach((item) => mergedProvenance.add(item));
        });
        const base = value.findings[0];
        consensus.push(
          normalizeFinding({
            ...base,
            id: base.id || topic,
            signals: Array.from(mergedSignals),
            assumptions: Array.from(mergedAssumptions),
            provenance: Array.from(mergedProvenance),
          })
        );
      }
    });

    return consensus.sort((a, b) => a.id.localeCompare(b.id));
  }

  private buildDisagreements(assessments: PersonaAssessment[]): Disagreement[] {
    interface DisagreementPosition {
      persona: string;
      finding: Finding;
    }
    const topics = new Map<string, { positions: DisagreementPosition[]; signals: Set<string>; assumptions: Set<string> }>();

    assessments.forEach((assessment) => {
      assessment.findings.forEach((finding) => {
        const topic = finding.topic || finding.id || finding.summary;
        const entry = topics.get(topic);
        if (entry) {
          entry.positions.push({ persona: assessment.persona, finding });
          finding.signals.forEach((signal) => entry.signals.add(signal));
          finding.assumptions.forEach((assumption) => entry.assumptions.add(assumption));
        } else {
          topics.set(topic, {
            positions: [{ persona: assessment.persona, finding }],
            signals: new Set(finding.signals),
            assumptions: new Set(finding.assumptions),
          });
        }
      });
    });

    const disagreements: Disagreement[] = [];
    topics.forEach((value, topic) => {
      const uniqueSummaries = new Set(value.positions.map((position) => position.finding.summary));
      const uniqueJudgments = new Set(value.positions.map((position) => position.finding.judgment));
      if (value.positions.length > 1 && (uniqueSummaries.size > 1 || uniqueJudgments.size > 1)) {
        disagreements.push({
          id: topic,
          topic,
          positions: [...value.positions].sort((a, b) => a.persona.localeCompare(b.persona)),
          signals: Array.from(value.signals),
          assumptions: Array.from(value.assumptions),
        });
      }
    });

    return disagreements.sort((a, b) => a.id.localeCompare(b.id));
  }

  private collectUncertainties(assessments: PersonaAssessment[]): Uncertainty[] {
    const seen = new Map<string, Uncertainty>();
    assessments.forEach((assessment) => {
      assessment.uncertainties.forEach((uncertainty) => {
        if (!seen.has(uncertainty.id)) {
          seen.set(uncertainty.id, uncertainty);
        }
      });
    });
    return Array.from(seen.values()).sort((a, b) => a.id.localeCompare(b.id));
  }
}
