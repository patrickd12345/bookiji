import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export interface ModuleSpec {
  id: string;
  name?: string;
  path: string;
  requiredFiles?: string[];
}

export interface RuntimeProfileSpec {
  name: string;
  config: string;
}

export interface ContractSpec {
  id: string;
  name?: string;
  file: string;
  requiredSections?: string[];
}

export interface CatalogSpec {
  folder: string;
  expectedExtensions?: string[];
}

export interface AuditFeedSpec {
  name: string;
  files: string[];
}

export interface TemporalLedgerSpec {
  name: string;
  file: string;
}

export interface TimelineSpec {
  name: string;
  hint?: string;
  requiredFiles: string[];
}

export interface ServiceSpec {
  id: string;
  folder: string;
}

export interface OpsDiagnosticsSpec {
  smokeTests?: string[];
}

export interface ScenarioSpec {
  folder: string;
  chaosProfile?: string;
}

export interface TrafficSpec {
  samples?: string;
  loadPatterns?: string;
}

export interface KnowledgeBaseSpec {
  root: string;
  requiredFiles?: string[];
}

export interface ChannelSpec {
  id: string;
  folder: string;
}

export interface AnalyticsSpec {
  schema?: string;
  required?: string[];
}

export interface ContractFolderSpec {
  schema?: string;
  required?: string[];
}

export interface GenomeDomains {
  core: {
    modules: ModuleSpec[];
    runtimeProfiles?: RuntimeProfileSpec[];
  };
  events: {
    contracts?: ContractSpec[];
    catalog?: CatalogSpec;
    telemetry?: { auditFeeds?: AuditFeedSpec[] };
  };
  analytics?: AnalyticsSpec;
  temporal: {
    audit?: { ledgers?: TemporalLedgerSpec[] };
    timelines?: TimelineSpec[];
  };
  opsai: {
    services?: ServiceSpec[];
    diagnostics?: OpsDiagnosticsSpec;
  };
  simcity: {
    scenarios?: ScenarioSpec;
    traffic?: TrafficSpec;
  };
  helpCenter: {
    knowledgeBase?: KnowledgeBaseSpec;
    userGuides?: { folder?: string };
  };
  notifications: {
    channels?: ChannelSpec[];
    requiredFiles?: string[];
  };
  trustSafety: {
    ledgers?: string[];
    drills?: { folder?: string };
  };
  businessIntelligence: {
    telemetry?: { funnels?: string[] };
    qualityGates?: string[];
  };
  governance: {
    policies?: string[];
    approvals?: { changeControl?: string };
    contracts?: string[];
    required?: boolean;
  };
  evolution: {
    flags?: string[];
    roadmap?: { file?: string };
  };
  notifications_2?: ContractFolderSpec;
  trust_safety?: ContractFolderSpec;
}

export interface GenomeSpec {
  version: string;
  codename?: string;
  releaseDate?: string;
  description?: string;
  domains: GenomeDomains;
}

export interface RepoContext {
  repoRoot: string;
  genomePath: string;
}

export interface DomainValidationResult {
  domain: string;
  errors: string[];
  warnings: string[];
}

function assertString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Expected ${field} to be a non-empty string`);
  }
  return value;
}

function coerceArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function loadGenome(genomePath = path.join(process.cwd(), "genome", "master-genome.yaml")): GenomeSpec {
  if (!fs.existsSync(genomePath)) {
    throw new Error(`Genome spec not found at ${genomePath}`);
  }

  const raw = fs.readFileSync(genomePath, "utf8");
  const parsed = yaml.load(raw);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Genome spec is empty or invalid");
  }

  const root = parsed as Record<string, unknown>;
  const version = assertString(root.version, "version");
  const domainsRaw = root.domains;

  if (!domainsRaw || typeof domainsRaw !== "object") {
    throw new Error("Genome spec is missing required 'domains' section");
  }

  const domains = domainsRaw as Record<string, unknown>;

  const normalizeModules = coerceArray<ModuleSpec>(domains.core && (domains.core as any).modules).map((module) => {
    if (!module || typeof module !== "object") {
      throw new Error("Module entries must be objects");
    }
    const record = module as unknown as Record<string, unknown>;
    return {
      id: assertString(record.id, "domains.core.modules[].id"),
      name: typeof record.name === "string" ? record.name : undefined,
      path: assertString(record.path, "domains.core.modules[].path"),
      requiredFiles: coerceArray<string>(record.requiredFiles),
    } satisfies ModuleSpec;
  });

  if (normalizeModules.length === 0) {
    throw new Error("Genome spec must define at least one core module");
  }

  const genome: GenomeSpec = {
    version,
    codename: typeof root.codename === "string" ? root.codename : undefined,
    releaseDate: typeof root.releaseDate === "string" ? root.releaseDate : undefined,
    description: typeof root.description === "string" ? root.description : undefined,
    domains: {
      core: {
        modules: normalizeModules,
        runtimeProfiles: coerceArray<RuntimeProfileSpec>(domains.core && (domains.core as any).runtimeProfiles),
      },
      events: {
        contracts: coerceArray<ContractSpec>(domains.events && (domains.events as any).contracts),
        catalog: (domains.events && (domains.events as any).catalog) as CatalogSpec | undefined,
        telemetry: (domains.events && (domains.events as any).telemetry) as GenomeDomains["events"]["telemetry"],
      },
      analytics: {
        schema: typeof (domains.analytics as any)?.schema === "string" ? (domains.analytics as any).schema : undefined,
        required: coerceArray<string>(domains.analytics && (domains.analytics as any).required),
      },
      temporal: {
        audit: (domains.temporal && (domains.temporal as any).audit) as GenomeDomains["temporal"]["audit"],
        timelines: coerceArray<TimelineSpec>(domains.temporal && (domains.temporal as any).timelines),
      },
      opsai: {
        services: coerceArray<ServiceSpec>(domains.opsai && (domains.opsai as any).services),
        diagnostics: (domains.opsai && (domains.opsai as any).diagnostics) as OpsDiagnosticsSpec | undefined,
      },
      simcity: {
        scenarios: (domains.simcity && (domains.simcity as any).scenarios) as ScenarioSpec | undefined,
        traffic: (domains.simcity && (domains.simcity as any).traffic) as TrafficSpec | undefined,
      },
      helpCenter: {
        knowledgeBase: (domains.helpCenter && (domains.helpCenter as any).knowledgeBase) as KnowledgeBaseSpec | undefined,
        userGuides: (domains.helpCenter && (domains.helpCenter as any).userGuides) as GenomeDomains["helpCenter"]["userGuides"],
      },
      notifications: {
        channels: coerceArray<ChannelSpec>(domains.notifications && (domains.notifications as any).channels),
        requiredFiles: coerceArray<string>(domains.notifications && (domains.notifications as any).requiredFiles),
      },
      trustSafety: {
        ledgers: coerceArray<string>(domains.trustSafety && (domains.trustSafety as any).ledgers),
        drills: (domains.trustSafety && (domains.trustSafety as any).drills) as GenomeDomains["trustSafety"]["drills"],
      },
      businessIntelligence: {
        telemetry: (domains.businessIntelligence && (domains.businessIntelligence as any).telemetry) as GenomeDomains["businessIntelligence"]["telemetry"],
        qualityGates: coerceArray<string>(domains.businessIntelligence && (domains.businessIntelligence as any).qualityGates),
      },
      governance: {
        policies: coerceArray<string>(domains.governance && (domains.governance as any).policies),
        approvals: (domains.governance && (domains.governance as any).approvals) as GenomeDomains["governance"]["approvals"],
        contracts: coerceArray<string>(domains.governance && (domains.governance as any).contracts),
        required:
          typeof (domains.governance as any)?.required === "boolean"
            ? ((domains.governance as any).required as boolean)
            : false,
      },
      evolution: {
        flags: coerceArray<string>(domains.evolution && (domains.evolution as any).flags),
        roadmap: (domains.evolution && (domains.evolution as any).roadmap) as GenomeDomains["evolution"]["roadmap"],
      },
      notifications_2: {
        schema:
          typeof (domains as any)?.notifications_2?.schema === "string"
            ? (domains as any).notifications_2.schema
            : undefined,
        required: coerceArray<string>((domains as any)?.notifications_2?.required),
      },
      trust_safety: {
        schema:
          typeof (domains as any)?.trust_safety?.schema === "string"
            ? (domains as any).trust_safety.schema
            : undefined,
        required: coerceArray<string>((domains as any)?.trust_safety?.required),
      },
    },
  };

  return genome;
}
