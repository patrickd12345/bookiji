// SimCity creates life.
// It must never detect, label, classify, or evaluate behavior.
// OpsAI observes. SimCity does not think.

import { Actor } from './population';
import { now } from './clock';

function baseUrl() {
  return process.env.SIMCITY_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

function headers(actor: Actor) {
  return {
    'Content-Type': 'application/json',
    'x-simcity-actor': actor.id,
    'x-simcity-type': actor.type
  };
}

export async function attemptBooking(actor: Actor) {
  const payload = {
    actorId: actor.id,
    actorType: actor.type,
    requestedAt: now()
  };

  await fetch(`${baseUrl()}/api/bookings/create`, {
    method: 'POST',
    headers: headers(actor),
    body: JSON.stringify(payload)
  });
}

export async function cancelBooking(actor: Actor) {
  const payload = {
    actorId: actor.id,
    actorType: actor.type,
    requestedAt: now()
  };

  await fetch(`${baseUrl()}/api/bookings/cancel`, {
    method: 'POST',
    headers: headers(actor),
    body: JSON.stringify(payload)
  });
}

export async function openSupportTicket(actor: Actor) {
  const payload = {
    actorId: actor.id,
    actorType: actor.type,
    createdAt: now(),
    message: 'Routine support ping from SimCity daemon'
  };

  await fetch(`${baseUrl()}/api/v1/support/tickets`, {
    method: 'POST',
    headers: headers(actor),
    body: JSON.stringify(payload)
  });
}
