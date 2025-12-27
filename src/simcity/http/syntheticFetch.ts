import { applySyntheticHeaders, SyntheticHeaderSet } from "../contracts/SyntheticHeaders";
import { assertSimCityAllowed } from "@/lib/env/operationalInvariants";

export interface SyntheticFetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  traceId?: string;
}

const DEFAULT_TIMEOUT = 10000;
const DEFAULT_RETRIES = 2;
const DEFAULT_BACKOFF = 250;
const USER_AGENT = "bookiji-simcity/2";

function validateEnvironment(url: string): void {
  // Use operational invariants to enforce SimCity rules
  assertSimCityAllowed();
  
  // Additional URL allowlist check

  const allowedTargets = [
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i,
    /staging/i,
  ];
  const matchesAllowlist = allowedTargets.some((pattern) => pattern.test(url));
  if (!matchesAllowlist) {
    throw new Error("SimCity synthetic traffic target is not allowlisted");
  }
}

async function executeFetch(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function syntheticFetch(
  url: string,
  init: SyntheticFetchOptions = {},
): Promise<{ response: Response; headers: SyntheticHeaderSet }> {
  validateEnvironment(url);

  const headers = new Headers(init.headers);
  const synthetic = applySyntheticHeaders(headers, init.traceId);
  headers.set("user-agent", USER_AGENT);

  const { timeoutMs = DEFAULT_TIMEOUT, retries = DEFAULT_RETRIES, backoffMs = DEFAULT_BACKOFF, ...rest } = init;
  const requestInit: RequestInit = { ...rest, headers };

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await executeFetch(url, requestInit, timeoutMs);
      return { response, headers: synthetic };
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Synthetic fetch failed");
}
