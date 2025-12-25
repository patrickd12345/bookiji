import { generateSyntheticBookings } from './bookings';
import { createEventStream, publishEvent } from './events';
import {
  advanceSimClock,
  getSimState,
  notifyDashboardHooks,
  notifyMetricsHooks,
  recordBookings,
  resetSimState,
  setSpeed,
  setStatus,
  updateSimState,
} from './state';
import { pushMetricsUpdate, pushOpsSummary, updateMetricsWithBookings, createEmptyEngineMetrics } from './metrics';
import { resolveScenarioOverride } from './scenarios';
import { SimulationStartOptions } from './types';

class SimCityEngine {
  private timer: NodeJS.Timeout | null = null;
  private keepAlive: NodeJS.Timeout | null = null;
  private stopTimer: NodeJS.Timeout | null = null;

  start(options?: SimulationStartOptions) {
    const current = getSimState();
    if (current.status === 'running') {
      throw new Error('Simulation already running');
    }

    const override = resolveScenarioOverride(options?.scenario ?? current.scenario);
    const runDurationMinutes = options?.durationMinutes ?? override.durationMinutes;

    resetSimState({
      speed: options?.speed ?? current.speed,
      scenario: options?.scenario ?? override.id,
      timezone: options?.timezone ?? current.timezone,
      time: options?.startTime ?? Date.now(),
      metrics: createEmptyEngineMetrics(),
      baseTickMs: options?.baseTickMs ?? current.baseTickMs,
      minutesPerTick: options?.minutesPerTick ?? current.minutesPerTick,
    });

    const next = getSimState();
    updateSimState({
      startedAt: new Date(next.time).toISOString(),
      metrics: { ...next.metrics, scenario: next.scenario },
    });
    setStatus('running');

    publishEvent({
      type: 'start',
      timestamp: new Date().toISOString(),
      data: { scenario: next.scenario, speed: next.speed },
    });

    this.scheduleTick(override);
    this.scheduleStop(override, runDurationMinutes);
    this.scheduleKeepAlive();
  }

  pause() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    setStatus('paused');
    publishEvent({ type: 'pause', timestamp: new Date().toISOString() });
  }

  reset(reason?: Record<string, unknown>) {
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.keepAlive) {
      clearInterval(this.keepAlive);
      this.keepAlive = null;
    }

    resetSimState({ metrics: createEmptyEngineMetrics() });
    publishEvent({ type: 'reset', timestamp: new Date().toISOString(), data: reason });
  }

  setSpeed(multiplier: number) {
    setSpeed(Math.max(0.1, multiplier));
    publishEvent({ type: 'speed', timestamp: new Date().toISOString(), data: { speed: multiplier } });

    const state = getSimState();
    const override = resolveScenarioOverride(state.scenario);
    this.scheduleTick(override);
  }

  private scheduleTick(override: ReturnType<typeof resolveScenarioOverride>) {
    if (this.timer) {
      clearInterval(this.timer);
    }

    const state = getSimState();
    const tickMs = (state.baseTickMs / Math.max(0.1, state.speed)) / (override.clockMultiplier ?? 1);

    this.timer = setInterval(() => this.tick(), tickMs);
  }

  private scheduleStop(override: ReturnType<typeof resolveScenarioOverride>, durationMinutes?: number) {
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }

    const minutes = durationMinutes ?? override?.durationMinutes;
    if (minutes) {
      const durationMs = minutes * 60 * 1000;
      this.stopTimer = setTimeout(() => {
        this.reset({
          reason: 'auto_stop',
          scenario: override.id,
          durationMinutes: minutes,
        });
      }, durationMs);
    }
  }

  private scheduleKeepAlive() {
    if (this.keepAlive) {
      clearInterval(this.keepAlive);
    }

    this.keepAlive = setInterval(() => {
      publishEvent({
        type: 'keepalive',
        timestamp: new Date().toISOString(),
        data: { status: getSimState().status },
      });
    }, 30000);
  }

  private tick() {
    const wallStart = Date.now();
    const state = getSimState();
    if (state.status !== 'running') return;

    const override = resolveScenarioOverride(state.scenario);
    const tickMs = state.baseTickMs * (override.clockMultiplier ?? 1);

    const advancedState = advanceSimClock(tickMs);
    const bookings = generateSyntheticBookings(advancedState, override);
    recordBookings(bookings);

    const metrics = updateMetricsWithBookings(advancedState.metrics, getSimState(), bookings);
    metrics.opsSummaryPushes += 1;
    metrics.metricsAiPushes += 1;
    metrics.dashboardHookInvocations += advancedState.hooks.length;
    metrics.lastTickDurationMs = Date.now() - wallStart;

    updateSimState({ metrics });

    publishEvent({
      type: 'tick',
      timestamp: new Date().toISOString(),
      data: {
        tick: advancedState.tick,
        time: advancedState.time,
        scenario: advancedState.scenario,
        bookingsGenerated: bookings.length,
        speed: advancedState.speed,
      },
    });

    bookings.forEach(booking => {
      publishEvent({ type: 'booking', timestamp: new Date().toISOString(), data: booking });
    });

    pushMetricsUpdate(metrics);
    notifyMetricsHooks(metrics);
    pushOpsSummary(getSimState());
    notifyDashboardHooks(getSimState());
  }

  getEventStream(signal?: AbortSignal) {
    return createEventStream(signal);
  }

  getSnapshot() {
    return getSimState();
  }

  isRunning() {
    return getSimState().status === 'running';
  }
}

let engine: SimCityEngine | null = null;

export const getSimEngine = (): SimCityEngine => {
  if (!engine) {
    engine = new SimCityEngine();
  }
  return engine;
};
