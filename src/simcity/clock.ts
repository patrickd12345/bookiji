// SimCity creates life.
// It must never detect, label, classify, or evaluate behavior.
// OpsAI observes. SimCity does not think.

let simulatedTime = Date.now();

export function advanceClock(deltaMs: number) {
  simulatedTime += deltaMs;
  return simulatedTime;
}

export function now() {
  return simulatedTime;
}
