import crypto from "node:crypto";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => stableStringify(item));
    return `[${items.join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .map(([key, val]) => [key, val] as const)
    .sort(([a], [b]) => a.localeCompare(b));

  const serialized = entries.map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`);
  return `{${serialized.join(",")}}`;
}

export function deterministicHash(value: unknown, algorithm: "sha256" = "sha256"): string {
  const hasher = crypto.createHash(algorithm);
  hasher.update(stableStringify(value));
  return hasher.digest("hex");
}
