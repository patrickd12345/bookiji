import { randomUUID, createHmac } from "crypto";

export interface SyntheticHeaderSet {
  readonly traceId: string;
  readonly version: string;
  readonly source: string;
  readonly signature?: string;
}

const SYNTHETIC_VERSION = "2";
const SYNTHETIC_SOURCE = "simcity";
const TRACE_HEADER = "X-Bookiji-Synthetic-Trace";
const SIGNATURE_HEADER = "X-Bookiji-Synthetic-Signature";

function buildSignature(traceId: string): string | undefined {
  const secret = process.env.SIMCITY_HMAC_SECRET;
  if (!secret) return undefined;

  const hmac = createHmac("sha256", secret);
  hmac.update(traceId, "utf8");
  return hmac.digest("hex");
}

export function buildSyntheticHeaders(traceId: string = randomUUID()): SyntheticHeaderSet {
  const signature = buildSignature(traceId);
  return {
    traceId,
    signature,
    source: SYNTHETIC_SOURCE,
    version: SYNTHETIC_VERSION,
  };
}

export function applySyntheticHeaders(headers: Headers, traceId?: string): SyntheticHeaderSet {
  const synthetic = buildSyntheticHeaders(traceId);

  headers.set("X-Bookiji-Synthetic", SYNTHETIC_SOURCE);
  headers.set("X-Bookiji-Synthetic-Version", SYNTHETIC_VERSION);
  headers.set(TRACE_HEADER, synthetic.traceId);
  if (synthetic.signature) {
    headers.set(SIGNATURE_HEADER, synthetic.signature);
  }

  return synthetic;
}

export function parseSyntheticTrace(headers: Headers): SyntheticHeaderSet | undefined {
  const syntheticHeader = headers.get("X-Bookiji-Synthetic");
  const traceId = headers.get(TRACE_HEADER);
  const version = headers.get("X-Bookiji-Synthetic-Version") ?? undefined;
  if (syntheticHeader !== SYNTHETIC_SOURCE || !traceId || !version) return undefined;

  return {
    traceId,
    version,
    source: SYNTHETIC_SOURCE,
    signature: headers.get(SIGNATURE_HEADER) ?? undefined,
  };
}

export const SyntheticHeaderNames = {
  Synthetic: "X-Bookiji-Synthetic",
  Version: "X-Bookiji-Synthetic-Version",
  Trace: TRACE_HEADER,
  Signature: SIGNATURE_HEADER,
} as const;
