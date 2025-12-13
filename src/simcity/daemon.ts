// SimCity creates life.
// It must never detect, label, classify, or evaluate behavior.
// OpsAI observes. SimCity does not think.

import { cityTick } from './cityLoop';

let running = false;

export async function powerOn() {
  if (running) return;
  running = true;
  while (running) {
    await cityTick();
  }
}

export function powerOff() {
  running = false;
}

export function isRunning() {
  return running;
}
