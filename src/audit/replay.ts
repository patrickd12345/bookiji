import { AuditTimeline, ReplayCursor, ReplayResult, ReplayState } from "./types";
import { deepFreeze } from "./utils";

function reduceState(frames: AuditTimeline["frames"], index: number): ReplayState {
  const counts: Record<string, number> = {};
  let syntheticSeen = 0;
  let realSeen = 0;
  let lastSignals: string[] = [];
  let lastFrame: AuditTimeline["frames"][number] | undefined;

  for (let i = 0; i <= index && i < frames.length; i++) {
    const frame = frames[i];
    lastFrame = frame;
    const type = frame.envelope.event.type;
    counts[type] = (counts[type] ?? 0) + 1;
    if (frame.provenance === "synthetic") {
      syntheticSeen += 1;
    } else {
      realSeen += 1;
    }
    if (frame.trustSafety?.signals?.length) {
      lastSignals = frame.trustSafety.signals.slice();
    }
  }

  return deepFreeze({
    position: Math.min(index + 1, frames.length),
    lastFrame,
    eventCounts: counts,
    syntheticSeen,
    realSeen,
    lastSignals,
  });
}

export function createReplayCursor(timeline: AuditTimeline, startIndex = 0): ReplayCursor {
  const bounded = Math.max(0, Math.min(startIndex, timeline.frames.length));
  return {
    timelineId: timeline.id,
    position: bounded,
    completed: bounded >= timeline.frames.length,
  };
}

export function replayNext(timeline: AuditTimeline, cursor: ReplayCursor): ReplayResult {
  if (cursor.completed || cursor.position >= timeline.frames.length) {
    const finalState = reduceState(timeline.frames, timeline.frames.length - 1);
    return {
      cursor: { ...cursor, position: timeline.frames.length, completed: true },
      frame: undefined,
      state: finalState,
    };
  }

  const frame = timeline.frames[cursor.position];
  const state = reduceState(timeline.frames, cursor.position);
  const nextCursor: ReplayCursor = {
    timelineId: timeline.id,
    position: cursor.position + 1,
    completed: cursor.position + 1 >= timeline.frames.length,
  };

  return { cursor: nextCursor, frame, state };
}

export function jumpToTime(timeline: AuditTimeline, timestamp: number): ReplayCursor {
  const index = timeline.frames.findIndex((frame) => frame.timestamp >= timestamp);
  if (index === -1) {
    return createReplayCursor(timeline, timeline.frames.length);
  }
  return createReplayCursor(timeline, index);
}

export function jumpToEvent(timeline: AuditTimeline, eventId: string): ReplayCursor {
  const index = timeline.frames.findIndex((frame) => frame.id === eventId);
  if (index === -1) {
    return createReplayCursor(timeline, timeline.frames.length);
  }
  return createReplayCursor(timeline, index);
}

export function replayDeterministically(timeline: AuditTimeline): ReplayState {
  if (!timeline.frames.length) {
    return deepFreeze({
      position: 0,
      eventCounts: {},
      syntheticSeen: 0,
      realSeen: 0,
      lastSignals: [],
    });
  }
  return reduceState(timeline.frames, timeline.frames.length - 1);
}
