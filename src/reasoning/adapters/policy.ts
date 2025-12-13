export interface ExternalAdapterPolicyEntry {
  readonly name: "langchain" | "n8n" | string;
  readonly authoritative: false;
  readonly emits_reasoning_artifacts: false;
  readonly bypasses_governance: false;
  readonly bypasses_determinism: false;
  readonly bypasses_consent: false;
}

export interface ExternalAdapterPolicy {
  readonly policy_version: "external-adapter-policy/v1";
  readonly adapters: readonly ExternalAdapterPolicyEntry[];
  readonly notes?: readonly string[];
}

export const DEFAULT_EXTERNAL_ADAPTER_POLICY: ExternalAdapterPolicy = {
  policy_version: "external-adapter-policy/v1",
  adapters: [
    {
      name: "langchain",
      authoritative: false,
      emits_reasoning_artifacts: false,
      bypasses_governance: false,
      bypasses_determinism: false,
      bypasses_consent: false,
    },
    {
      name: "n8n",
      authoritative: false,
      emits_reasoning_artifacts: false,
      bypasses_governance: false,
      bypasses_determinism: false,
      bypasses_consent: false,
    },
  ],
  notes: [
    "External orchestration adapters are strictly non-authoritative.",
    "Adapters cannot emit, mutate, or verify ReasoningArtifacts.",
    "Adapters cannot bypass governance, determinism, or consent gates.",
  ],
};

function assertPolicyEntry(entry: ExternalAdapterPolicyEntry): void {
  if (entry.authoritative) {
    throw new Error(`External adapter "${entry.name}" cannot be authoritative`);
  }
  if (entry.emits_reasoning_artifacts) {
    throw new Error(`External adapter "${entry.name}" cannot emit reasoning artifacts`);
  }
  if (entry.bypasses_governance || entry.bypasses_determinism || entry.bypasses_consent) {
    throw new Error(`External adapter "${entry.name}" cannot bypass governance, determinism, or consent`);
  }
}

export function assertExternalAdapterPolicy(
  policy: ExternalAdapterPolicy,
  usage: readonly string[] = []
): void {
  if (!policy || policy.policy_version !== "external-adapter-policy/v1") {
    throw new Error("Unsupported external adapter policy");
  }

  policy.adapters.forEach(assertPolicyEntry);

  const normalizedUsage = [...usage].filter(Boolean);
  if (normalizedUsage.length) {
    throw new Error("External adapters are non-authoritative and cannot emit ReasoningArtifacts");
  }
}
