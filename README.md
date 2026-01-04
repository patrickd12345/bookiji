# Bookiji Scheduling

Bookiji Scheduling is a first-to-market booking flow built around commitment: it makes it easy for two parties to agree on a slot, pay a small commitment fee, exchange contact details, and move forward with serious intent.

## What Bookiji Is / What It Is Not

**Bookiji is**
- A scheduling product that confirms a slot and records a committed booking.
- A commitment mechanism that reduces flakiness by requiring skin in the game.
- A clean handoff: once both sides have what they need to proceed, Bookiji exits.
- An integration layer for existing calendars (Google / Outlook) in v1, not a replacement.

**Bookiji is not**
- A marketplace or a directory.
- A long-running intermediary between two parties.
- A dispute system, a mediator, or an arbiter of what happened after booking.
- A service quality guarantor.

## How Bookiji Scheduling Works

1. A requester selects a provider and a slot.
2. Bookiji checks conflicts via connected calendars (Google / Outlook) and verifies the slot can be committed.
3. The requester pays a commitment fee to lock the booking.
4. Bookiji confirms the booking and shares contact information between the two parties.
5. The two parties take it from there; Bookiji exits after the handoff.

## Skin in the Game: How Commitment Is Encouraged

The commitment fee exists to align incentives: “you paid for it, you’re more likely to show up”. Bookiji uses that simple mechanic to reduce wasted slots and ghost bookings without building a judgment layer on top.

## Explicit Scope Boundaries

- Bookiji guarantees the booking mechanics (commitment, confirmation, and handoff), not the service result.
- Bookiji never supports disputes, mediation, arbitration, or post-booking judgment.
- Bookiji does not evaluate who is right, who is wrong, or what should happen after booking.
- Bookiji does not stay involved after the booking is committed and contact information is exchanged.

## Who Bookiji Scheduling Is For (v1)

- Builders and early adopters who want a commitment-first scheduling flow with clear boundaries.
- Providers who lose money when slots are wasted.
- Requesters who value reliability and want fewer last-minute surprises.
- Teams that already live in Google Calendar or Outlook and want scheduling that plugs in, not a new calendar to run.

## Canonical positioning statement

Bookiji Scheduling is commitment-first booking: lock the slot with skin in the game, exchange contact details, and exit.
