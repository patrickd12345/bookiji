export interface LogicalTime {
  logical: number; // increments per event
  wallClock: number; // Date.now()
}
