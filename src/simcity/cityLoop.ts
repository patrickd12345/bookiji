// SimCity creates life.
// It must never detect, label, classify, or evaluate behavior.
// OpsAI observes. SimCity does not think.

import { advanceClock } from './clock';
import { pickRandomActors } from './population';
import { RATES } from './rates';
import { attemptBooking, cancelBooking, openSupportTicket } from './traffic';

let loopDelayMs = 50;
let tickAdvanceMs = 60_000;

export function setLoopDelayMs(ms: number) {
  loopDelayMs = Math.max(0, ms);
}

export function setTickAdvanceMs(ms: number) {
  tickAdvanceMs = Math.max(1, ms);
}

export async function cityTick() {
  advanceClock(tickAdvanceMs);

  const actors = pickRandomActors(randomInt(1, 10));

  for (const actor of actors) {
    if (Math.random() < RATES.bookingAttempt) {
      fireAndForget(() => attemptBooking(actor));
    }

    if (Math.random() < RATES.cancelAttempt) {
      fireAndForget(() => cancelBooking(actor));
    }

    if (Math.random() < RATES.supportTicket) {
      fireAndForget(() => openSupportTicket(actor));
    }
  }

  await sleep(loopDelayMs);
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function fireAndForget(fn: () => Promise<unknown>) {
  fn().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[simcity] task failed', err);
  });
}
