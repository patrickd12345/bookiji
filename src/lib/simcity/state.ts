import { DashboardHook, EngineMetrics, SimulationState, SimulationStatus } from './types';
import { createEmptyEngineMetrics } from './metrics';

const DEFAULT_BASE_TICK_MS = 1000;
const DEFAULT_MINUTES_PER_TICK = 10;

const baseState: SimulationState = {
  status: 'idle',
  speed: 1,
  time: Date.now(),
  tick: 0,
  timezone: 'UTC',
  scenario: null,
  startedAt: undefined,
  lastTickAt: undefined,
  baseTickMs: DEFAULT_BASE_TICK_MS,
  minutesPerTick: DEFAULT_MINUTES_PER_TICK,
  bookings: [],
  metrics: createEmptyEngineMetrics(),
  hooks: [],
};

let simState: SimulationState = { ...baseState };
const dashboardHooks: DashboardHook[] = [];

export const getSimState = (): SimulationState => ({
  ...simState,
  bookings: [...simState.bookings],
  metrics: { ...simState.metrics },
  hooks: [...simState.hooks],
});

export const updateSimState = (partial: Partial<SimulationState>): SimulationState => {
  simState = { ...simState, ...partial };
  return getSimState();
};

export const resetSimState = (overrides: Partial<SimulationState> = {}): SimulationState => {
  simState = {
    ...baseState,
    time: overrides.time ?? Date.now(),
    startedAt: undefined,
    lastTickAt: undefined,
    scenario: overrides.scenario ?? null,
    speed: overrides.speed ?? baseState.speed,
    minutesPerTick: overrides.minutesPerTick ?? baseState.minutesPerTick,
    baseTickMs: overrides.baseTickMs ?? baseState.baseTickMs,
  };

  if (overrides.metrics) {
    simState.metrics = { ...overrides.metrics } as EngineMetrics;
  }

  if (overrides.timezone) {
    simState.timezone = overrides.timezone;
  }

  return getSimState();
};

export const setStatus = (status: SimulationStatus): SimulationState => {
  simState.status = status;
  return getSimState();
};

export const setSpeed = (speed: number): SimulationState => {
  simState.speed = speed;
  simState.metrics.syntheticClockDriftMs = 0;
  return getSimState();
};

export const advanceSimClock = (elapsedMs: number): SimulationState => {
  simState.time += elapsedMs * simState.speed;
  simState.lastTickAt = new Date().toISOString();
  simState.tick += 1;
  return getSimState();
};

export const recordBookings = (bookings: SimulationState['bookings']): SimulationState => {
  const limited = [...bookings, ...simState.bookings].slice(0, 200);
  simState.bookings = limited;
  simState.metrics.appointmentsGenerated += bookings.length;
  simState.metrics.lastTickDurationMs = 0;
  return getSimState();
};

export const attachDashboardHook = (hook: DashboardHook) => {
  if (!dashboardHooks.find(existing => existing.id === hook.id)) {
    dashboardHooks.push(hook);
    simState.hooks.push(hook.id);
  }
};

export const notifyDashboardHooks = (updatedState: SimulationState) => {
  dashboardHooks.forEach(hook => hook.onTick?.(updatedState));
};

export const notifyMetricsHooks = (metrics: EngineMetrics) => {
  dashboardHooks.forEach(hook => hook.onMetrics?.(metrics));
};
